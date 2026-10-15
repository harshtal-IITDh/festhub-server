import mongoose from "mongoose";
import { Competition } from "../models/index.js";

/**
 * Lazy-loads or registers the EventMember Mongoose model for backward compatibility
 * if EventMember is used in external modules.
 */
const getEventMemberModel = () => {
  if (mongoose.models.EventMember) {
    return mongoose.models.EventMember;
  }

  const eventMemberSchema = new mongoose.Schema(
    {
      event_id: { type: mongoose.Schema.Types.Mixed, required: true },
      user_id: { type: mongoose.Schema.Types.Mixed, required: true },
      role: {
        type: String,
        enum: ["LEAD", "CO_LEAD", "lead", "co_lead", "colead", "Lead", "Co-Lead"],
        required: true,
      },
    },
    { timestamps: true }
  );

  return mongoose.model("EventMember", eventMemberSchema);
};

/**
 * Normalizes role string to standard uppercase format (LEAD or CO_LEAD)
 */
const isLeadOrCoLead = (role) => {
  if (!role) return false;
  const normalized = String(role).toUpperCase().replace(/[\s-]/g, "_");
  return normalized === "LEAD" || normalized === "CO_LEAD" || normalized === "ADMIN";
};

/**
 * Extracts all candidate identifier strings for the current user
 * (supports userId, user_id, _id, id)
 */
const getUserIdentifierCandidates = (user) => {
  if (!user) return [];
  return [
    user.userId?.toString(),
    user.user_id?.toString(),
    user._id?.toString(),
    user.id?.toString(),
  ].filter(Boolean);
};

/**
 * Core admin authorization check logic
 */
const handleAdminCheck = async (req, res, next, options = {}) => {
  // 1. Ensure user is logged in
  if (!req.user) {
    return res.status(401).json({
      message: "Unauthorized: You must be logged in to access this resource",
    });
  }

  // 2. Ensure user has admin privileges
  if (req.user.role !== "admin") {
    return res.status(403).json({
      message: "Forbidden: Admin access required",
    });
  }

  // 3. Determine if this request is scoped to an event / competition
  let targetEventId = null;

  if (options.eventParam && req.params?.[options.eventParam]) {
    targetEventId = req.params[options.eventParam];
  } else if (options.eventId) {
    targetEventId = options.eventId;
  } else {
    // Check common route parameters, body, and query attributes
    targetEventId =
      req.params?.eventId ||
      req.params?.competitionId ||
      req.params?.event_id ||
      req.params?.competition_id ||
      req.body?.eventId ||
      req.body?.competitionId ||
      req.body?.event_id ||
      req.body?.competition_id ||
      req.query?.eventId ||
      req.query?.competitionId ||
      req.query?.event_id ||
      req.query?.competition_id;

    // Also check req.params.id if the URL explicitly denotes an event or competition path
    if (
      !targetEventId &&
      req.params?.id &&
      (req.baseUrl?.includes("event") ||
        req.baseUrl?.includes("competition") ||
        req.path?.includes("event") ||
        req.path?.includes("competition"))
    ) {
      targetEventId = req.params.id;
    }
  }

  // If no event scope was found:
  if (!targetEventId) {
    if (options.requireEvent) {
      return res.status(400).json({
        message: "Bad Request: Event or Competition ID is required for this route",
      });
    }
    // General admin route without event scope -> authorized
    return next();
  }

  // 4. Cross-Verification for Competition / Event Admin Scope
  // An event has two admins in charge (Lead & Co-Lead) with equal authority.
  // Admins in charge of Event A CANNOT interfere with Event B scope.
  const targetEventIdStr = String(targetEventId);
  const currentUserIdCandidates = getUserIdentifierCandidates(req.user);

  // A. Check in-memory preloaded competition or event on req
  const inMemoryCompetition = req.competition || req.event;
  if (inMemoryCompetition) {
    const compAdmins = [
      ...(inMemoryCompetition.admins || []),
      ...(inMemoryCompetition.adminUsers || []),
    ].map((a) => (a?._id ? a._id.toString() : a?.toString()));

    const isMatch = currentUserIdCandidates.some((uid) => compAdmins.includes(uid));
    if (isMatch) {
      return next();
    }
    return res.status(403).json({
      message: "Forbidden: You do not have admin permissions for this event/competition",
    });
  }

  // B. Check in-memory event memberships on req.user (for testing, token claims, or session)
  const inMemoryEvents = req.user.eventMembers || req.user.events || req.user.eventRoles || req.user.competitions;
  if (Array.isArray(inMemoryEvents)) {
    const matchingMembership = inMemoryEvents.find((m) => {
      const evId = String(m.event_id || m.eventId || m.competitionId || m._id || m.id);
      return evId === targetEventIdStr && isLeadOrCoLead(m.role || "LEAD");
    });

    if (matchingMembership) {
      req.eventMember = matchingMembership;
      return next();
    }

    // User is assigned to specific events, but not this one
    return res.status(403).json({
      message: "Forbidden: You do not have admin permissions (Lead or Co-Lead) for this event/competition",
    });
  }

  // Also check single in-memory event_id on req.user
  if (req.user.event_id || req.user.eventId) {
    const userEventId = String(req.user.event_id || req.user.eventId);
    const userRole = req.user.eventRole || "LEAD";
    if (userEventId === targetEventIdStr && isLeadOrCoLead(userRole)) {
      req.eventMember = { event_id: targetEventId, user_id: req.user.userId || req.user._id || req.user.id, role: userRole };
      return next();
    }
    return res.status(403).json({
      message: "Forbidden: You do not have admin permissions (Lead or Co-Lead) for this event/competition",
    });
  }

  // C. Query Database: Check Competition.admins field in MongoDB
  try {
    if (mongoose.connection?.readyState === 1) {
      const isObjectId = mongoose.Types.ObjectId.isValid(targetEventId);
      const queryConditions = [
        { name: targetEventId },
      ];
      if (isObjectId) {
        queryConditions.push({ _id: targetEventId });
      }

      // 1. Try finding Competition document
      const competition = await Competition.findOne({
        $or: queryConditions,
        isDeleted: false,
      });

      if (competition) {
        const assignedAdmins = [
          ...(competition.admins || []),
          ...(competition.adminUsers || []),
        ].map((a) => (a?._id ? a._id.toString() : a?.toString()));

        const isAuthorized = currentUserIdCandidates.some((uid) =>
          assignedAdmins.includes(uid)
        );

        if (isAuthorized) {
          req.competition = competition;
          req.event = competition;
          return next();
        }

        // Admin exists in system, but is not in the admins field for this competition
        return res.status(403).json({
          message: "Forbidden: You do not have admin permissions for this event/competition",
        });
      }

      // 2. Fallback to EventMember model if competition document not found
      const EventMember = getEventMemberModel();
      const member = await EventMember.findOne({
        $or: currentUserIdCandidates.map((uid) => ({
          user_id: uid,
          event_id: targetEventId,
        })),
        role: { $in: ["LEAD", "CO_LEAD", "lead", "co_lead", "colead", "Lead", "Co-Lead"] },
      });

      if (member) {
        req.eventMember = member;
        return next();
      }

      return res.status(403).json({
        message: "Forbidden: You do not have admin permissions (Lead or Co-Lead) for this event/competition",
      });
    }

    // If MongoDB is not connected and in-memory was not provided, deny access
    return res.status(403).json({
      message: "Forbidden: You do not have admin permissions (Lead or Co-Lead) for this event/competition",
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * isAdmin Middleware
 *
 * Can be used in two ways:
 * 1. Directly: router.get('/path', isLoggedIn, isAdmin, controller)
 * 2. As a factory: router.get('/path/:id', isLoggedIn, isAdmin('id'), controller)
 *    or router.get('/path/:eventId', isLoggedIn, isAdmin({ requireEvent: true }), controller)
 */
export const isAdmin = (arg1, arg2, arg3) => {
  // Used directly as middleware: isAdmin(req, res, next)
  if (arg1 && arg2 && typeof arg3 === "function") {
    return handleAdminCheck(arg1, arg2, arg3, {});
  }

  // Used as a factory: isAdmin("eventId") or isAdmin({ ... })
  const options = typeof arg1 === "string" ? { eventParam: arg1 } : arg1 || {};
  return (req, res, next) => {
    return handleAdminCheck(req, res, next, options);
  };
};

export default isAdmin;
