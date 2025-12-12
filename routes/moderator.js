/****************************************************************************
 * routes/moderator.js
 * --------------------------------------------------------------------------
 * Moderator routes.
 *
 * IN PROGRESS:
 * - Read-only access
 * - Displays moderation dashboard placeholder
 ****************************************************************************/

import { Router } from "express";
import { requireModeratorOrAdmin } from "../middleware/moderator.mw.js";

const router = Router();

/*****************************************************************************
 * GET /moderator
 * --------------------------------------------------------------------------
 * Moderator dashboard 
 ****************************************************************************/
router.get(
  "/",
  requireModeratorOrAdmin,
  async (req, res) => {
    try {
      const reportedPosts = await moderatorData.getReportedPosts();

      res.render("moderator/dashboard", {
        title: "Moderator Dashboard",
        reportedPosts
      });
    } catch (error) {
      res.status(500).render("errors", {
        title: "Error",
        error: error.message
      });
    }
  }
);

export default router;