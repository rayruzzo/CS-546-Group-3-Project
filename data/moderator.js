import { ObjectId } from "mongodb";
import mongoCollections from '../config/mongoCollections.js';
import postData from "./posts.js";

const posts = mongoCollections.posts;
const users = mongoCollections.users;

/****************************************************************************
 * GET REPORTED POSTS
 * --------------------------------------------------------------------------
 * Returns all posts currently flagged as reported.
 * Posts are enriched with user and location data for moderator review.
 ****************************************************************************/
async function getReportedPosts() {
  const postCollection = await posts();

  const reportedPosts = await postCollection
    .find({ reported: true })
    .sort({ createdAt: -1 })
    .toArray();

  return await postData.enrichPostsWithUserAndLocation(reportedPosts);
}

/****************************************************************************
 * CLEAR REPORT FLAG
 * --------------------------------------------------------------------------
 * Clears the reported flag on a post after moderator review.
 * The post remains visible to users.
 ****************************************************************************/
async function clearReport(postId) {
  if (!postId || !ObjectId.isValid(postId)) {
    throw new Error("Invalid postId provided to clearReport");
  }

  const postCollection = await posts();

  const updateResult = await postCollection.updateOne(
    { _id: new ObjectId(postId) },
    { $set: { reported: false, editedAt: new Date() } }
  );

  if (!updateResult.matchedCount) {
    throw new Error("Post not found");
  }

  return true;
}

/****************************************************************************
 * GET BANNABLE USERS
 * --------------------------------------------------------------------------
 * Returns users eligible for moderation actions.
 *
 * Notes:
 * - Includes regular users and moderators
 * - Excludes admins entirely
 * - Used to populate moderator/admin UI controls
 ****************************************************************************/
export async function getBannableUsers() {
  const userCollection = await users();

  return await userCollection.find(
  { role: { $in: ["user", "moderator"] } },
  {
    projection: {
      "profile.username": 1,
      role: 1,
      isBanned: 1
    }
  }
  ).toArray();
}

/****************************************************************************
 * BAN USER
 * --------------------------------------------------------------------------
 * Applies a ban to a target user.
 *
 * Rules enforced:
 * - Only moderators or admins may ban users
 * - Admins cannot be banned
 * - Moderators cannot ban other moderators
 *
 * Metadata recorded:
 * - bannedAt
 * - bannedBy
 ****************************************************************************/
export async function banUser({ actor, targetUserId }) {
  if (!actor || !actor.role) {
    throw new Error("Invalid actor");
  }

  const userCollection = await users();
  const targetUser = await userCollection.findOne({
    _id: new ObjectId(targetUserId)
  });

  if (!targetUser) {
    throw new Error("User not found");
  }

  // No one can ban admins
  if (targetUser.role === "admin") {
    throw new Error("Admins cannot be banned");
  }

  // Moderators cannot ban moderators
  if (actor.role === "moderator" && targetUser.role === "moderator") {
    throw new Error("Moderators cannot ban other moderators");
  }

  await userCollection.updateOne(
    { _id: targetUser._id },
    {
      $set: {
        isBanned: true,
        bannedAt: new Date(),
        bannedBy: actor._id
      }
    }
  );

  return { success: true };
}

/****************************************************************************
 * UNBAN USER
 * --------------------------------------------------------------------------
 * Removes a ban from a user.
 *
 * Rules enforced:
 * - Admins only
 * - Cannot unban admins (I dont think admins should never be banned)
 ****************************************************************************/
export async function unbanUser({ actor, targetUserId }) {
  if (!actor || actor.role !== "admin") {
    throw new Error("Only admins may unban users");
  }

  const userCollection = await users();
  const targetUser = await userCollection.findOne({
    _id: new ObjectId(targetUserId)
  });

  if (!targetUser) {
    throw new Error("User not found");
  }

  await userCollection.updateOne(
    { _id: targetUser._id },
    {
      $set: {
        isBanned: false
      },
      $unset: {
        bannedAt: "",
        bannedBy: ""
      }
    }
  );

  return { success: true };
}

/****************************************************************************
 * UPDATE USER ROLE
 * --------------------------------------------------------------------------
 * Admin-only role management
 *
 * Rules:
 * - Only admins may change roles
 * - Cannot modify admins
 * - Allowed transitions:  user <-> moderator
 ****************************************************************************/
export async function updateUserRole({ actor, targetUserId, newRole }) {
  if (!actor || actor.role !== "admin") {
    throw new Error("Only admins may change user roles");
  }

  if (!["user", "moderator"].includes(newRole)) {
    throw new Error("Invalid target role");
  }

  const userCollection = await users();
  const targetUser = await userCollection.findOne({
    _id: new ObjectId(targetUserId)
  });

  if (!targetUser) {
    throw new Error("User not found");
  }

  if (targetUser.role === "admin") {
    throw new Error("Admins cannot be modified");
  }

  await userCollection.updateOne(
    { _id: targetUser._id },
    {
      $set: {
        role: newRole,
        roleUpdatedAt: new Date(),
        roleUpdatedBy: actor._id
      }
    }
  );

  return { success: true };
}

/****************************************************************************
 * POST MODERATION ACTIONS (THIN WRAPPERS)
 * --------------------------------------------------------------------------
 * Delegates post-level moderation actions to the posts data layer.
 ****************************************************************************/
async function deletePost(postId) {
  return await postData.deletePost(postId);
}

async function markFulfilled(postId) {
  return await postData.markPostAsFulfilled(postId);
}

export default {
  getReportedPosts,
  clearReport,
  deletePost,
  getBannableUsers,
  banUser,
  unbanUser,
  markFulfilled,
  updateUserRole
};
