import { Router } from "express";
import { validateSchema } from "../middleware/validation.mw.js";
import { postIdParamSchema } from "../models/moderator.js";
import { renderErrorPage } from "../utils/errorUtils.js";

import moderatorData from "../data/moderator.js";
import { requireAdmin } from "../middleware/moderator.mw.js";

const router = Router();

/****************************************************************************
 * GET /moderator
 * --------------------------------------------------------------------------
 * Middleware:
 * requireModeratorOrAdmin:
 *   - Mounted on the app.js level for route.
 *   - Ensures user is authenticated
 *   - Ensures user role is moderator or admin
 *
 * Moderator dashboard showing reported posts.
 ****************************************************************************/
router.get("/", async (req, res) => {
  try {
    const reportedPosts = await moderatorData.getReportedPosts();

    return res.render("moderator/dashboard", {
      title: "Moderator Dashboard",
      user: req.session.user,
      reportedPosts
    });

  } catch (error) {
    console.error("Moderator dashboard failed:", error);
    return renderErrorPage(res, 500, "Unable to load moderator dashboard.");
  }
});

/****************************************************************************
 * POST /moderator/post/:id/clear-report
 * Middleware: requireModeratorOrAdmin
 *
 * USE:
 *   - After review, the report is determined to be invalid or the
 *     issue has been resolved.
 *   - Clearing a report keeps the post visible to users.
 ****************************************************************************/
router.post(
  "/post/:id/clear-report",
  validateSchema([postIdParamSchema, "params"]),
  async (req, res) => {
    try {
      await moderatorData.clearReport(req.params.id);
      return res.redirect("/moderator");
    } catch (error) {
      console.error("Clear report failed:", error);
      return renderErrorPage(res, 400, error.message || "Unable to clear report.");
    }
  }
);

/****************************************************************************
 * POST /moderator/post/:id/fulfill
 * Middleware: requireModeratorOrAdmin
 *
 * USE:
 *   - Marks the post as fulfilled.
 *   - Closes the request after its purpose has been satisfied.
 ****************************************************************************/
router.post(
  "/post/:id/fulfill",
  validateSchema([postIdParamSchema, "params"]),
  async (req, res) => {
    try {
      await moderatorData.markFulfilled(req.params.id);
      // resolving a report when a post is fulfilled
      await moderatorData.clearReport(req.params.id);

      return res.redirect("/moderator");
    } catch (error) {
      console.error("Fulfill failed:", error);
      return renderErrorPage(res, 400, error.message || "Unable to mark fulfilled.");
    }
  }
);

/****************************************************************************
 * POST /moderator/post/:id/delete
 * Middleware: requireModeratorOrAdmin
 *
 * USE:
 *   - Used when a post violates rules or requires removal.
 *   - This action permanently deletes the post and is irreversible.
 ****************************************************************************/
router.post(
  "/post/:id/delete",
  validateSchema([postIdParamSchema, "params"]),
  async (req, res) => {
    try {
      await moderatorData.deletePost(req.params.id);
      return res.redirect("/moderator");
    } catch (error) {
      console.error("Delete failed:", error);
      return renderErrorPage(res, 400, error.message || "Unable to delete post.");
    }
  }
);

/****************************************************************************
 * GET /moderator/users
 * --------------------------------------------------------------------------
 * Middleware: requireModeratorOrAdmin
 *
 * Description:
 *   Displays a list of users eligible for moderation actions.
 *
 * Notes:
 *   - Excludes admins
 *   - Includes users and moderators
 ****************************************************************************/
router.get("/users", async (req, res) => {
  const users = await moderatorData.getBannableUsers();
  //console.log(users); // Debug
  res.render("moderator/users", { users });
});

/****************************************************************************
 * POST /moderator/users/:id/ban
 * --------------------------------------------------------------------------
 * Middleware: requireModeratorOrAdmin
 *
 * Description:
 *   Applies a ban to a target user.
 *
 * Enforcement:
 *   - Admins cannot be banned
 *   - Moderators cannot ban other moderators
 ****************************************************************************/
router.post("/users/:id/ban", async (req, res) => {
  try {
    await moderatorData.banUser({
      actor: req.session.user,
      targetUserId: req.params.id
    });

    return res.redirect("/moderator/users");
  } catch (error) {
    console.error("Ban failed:", error);
    return renderErrorPage(
      res,
      400,
      error.message || "Unable to ban user."
    );
  }
});

/****************************************************************************
 * POST /moderator/users/:id/unban
 * --------------------------------------------------------------------------
 * Middleware
 * requireAdmin
 *   - Ensures user is authenticated
 *   - Ensures user role is an admin
 *
 * Description:
 *   Removes an existing ban from a user.
 *
 * Notes:
 *   - Admin-only action
 ****************************************************************************/
router.post(
  "/users/:id/unban",
  requireAdmin,
  async (req, res) => {
    try {
      await moderatorData.unbanUser({
        actor: req.session.user,
        targetUserId: req.params.id
      });

      return res.redirect("/moderator/users");
    } catch (error) {
      console.error("Unban failed:", error);
      return renderErrorPage(
        res,
        400,
        error.message || "Unable to unban user."
      );
    }
  }
);

export default router;
