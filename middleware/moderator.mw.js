/****************************************************************************
 * requireModeratorOrAdmin
 * --------------------------------------------------------------------------
 * Authorization middleware for moderator and admin access.
 *
 * Description:
 * - Restricts access to moderator-only routes (e.g. moderation dashboard)
 * - Ensures the user is:
 *    1) Authenticated and
 *    2) Authorized (role === "moderator" or "admin")
 *
 * TO DO:
 * - ban enforcement
 ****************************************************************************/
export function requireModeratorOrAdmin(req, res, next) {
  
  const user = req.session?.user;

  if (!user) {
    return res.status(401).render("errors", {
      title: "Unauthorized",
      error: "You must be logged in to access this page."
    });
  }

  // Must be moderator or admin
  if (user.role !== "moderator" && user.role !== "admin") {
    return res.status(403).render("errors", {
      title: "Forbidden",
      error: "You do not have permission to access this page."
    });
  }

  // Authorized
  next();
}