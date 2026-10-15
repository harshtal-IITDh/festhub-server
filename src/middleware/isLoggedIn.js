import { User } from "../models/index.js";
/**
 * isLoggedIn Middleware
 *
 * Verifies that the incoming request is made by an authenticated user.
 * Assumes the authentication layer (OAuth, JWT, session, etc.) has already
 * attached the user object to `req.user`.
 *
 * Behavior:
 * - If req.user is absent or invalid -> Blocks request with HTTP 401 Unauthorized.
 * - If req.user is marked as soft-deleted (isDeleted: true) -> Blocks request with HTTP 403 Forbidden.
 * - If authenticated -> Passes control to the next middleware via next().
 */

export const isLoggedIn = (req, res, next) => {
  // Check if req.user exists and has at least an identifier or role
  if (!req.user || (typeof req.user === "object" && Object.keys(req.user).length === 0)) {
    return res.status(401).json({
      message: "Unauthorized: You must be logged in to access this resource",
    });
  }

  // Soft delete check per Harshtal database design
  if (req.user.isDeleted) {
    return res.status(403).json({
      message: "Forbidden: Account is deactivated",
    });
  }

  next();
};

export default isLoggedIn;
