/**
 * Auth Controller
 * Contains the business logic for auth and authorization-related endpoints.
 *
 * NOTE: Full Google OAuth, session token creation, and onboarding logic will be
 * wired in here as part of the Authentication issue.
 */

/**
 * Get current authenticated user profile
 * Protected by: isLoggedIn
 */
export const getMe = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      message: "User profile retrieved successfully",
      user: req.user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify general admin access
 * Protected by: isLoggedIn, isAdmin
 */
export const testAdminAccess = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      message: "Admin access verified successfully",
      user: {
        id: req.user._id || req.user.id,
        name: req.user.name,
        role: req.user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify event-scoped admin access (Lead / Co-Lead)
 * Protected by: isLoggedIn, isAdmin
 */
export const testEventAdminAccess = async (req, res, next) => {
  try {
    const eventId = req.params.eventId || req.params.id;
    return res.status(200).json({
      success: true,
      message: `Event admin access verified for event: ${eventId}`,
      user: {
        id: req.user._id || req.user.id,
        name: req.user.name,
        role: req.user.role,
      },
      eventMember: req.eventMember || null,
    });
  } catch (error) {
    next(error);
  }
};
