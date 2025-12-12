import { renderErrorPage } from "../utils/errorUtils.js";

/****************************************************************************
 * requireModeratorOrAdmin
 * ------------------------------------------------------------
 * Moderator authorization middleware.
 *
 * Responsibilities:
 *   - Ensures the user is logged in
 *   - Ensures the user has moderator or admin privileges
 * **************************************************************************/

const requireModeratorOrAdmin = (req, res, next) => {
  try {
    const user = req.session?.user;

    // Must be logged in
    if (!user) {
      return renderErrorPage(res, 401, null);
    }

    // Must be moderator or admin
    if (user.role !== "moderator" && user.role !== "admin") {
      return renderErrorPage(res, 403, null);
    }

    next();
  } catch (error) {
    console.error("Moderator authorization middleware failed:", error);
    return renderErrorPage(res, 500, "Unable to authorize moderator access.");
  }
};

/****************************************************************************
 * requireAdmin
 * ------------------------------------------------------------
 * Admin Only authorization middleware. Used for unbanning.
 *
 * Responsibilities:
 *   - Ensures the user is logged in
 *   - Ensures the user has admin privileges.
 * **************************************************************************/

export function requireAdmin(req, res, next) {
  const user = req.session.user;

  if (!user || user.role !== "admin") {
    return renderErrorPage(res, 403, "Admins only");
  }

  next();
}

export default {
  requireModeratorOrAdmin,
  requireAdmin
};
