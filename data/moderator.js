/****************************************************************************
 * data/moderator.js
 * --------------------------------------------------------------------------
 * Moderator data functions.
 * Read operations + safe moderation actions.
 ****************************************************************************/

import { ObjectId } from "mongodb";
import mongoCollections from '../config/mongoCollections.js';

const posts = mongoCollections.posts;
import postData from "./posts.js";

/****************************************************************************
 * GET REPORTED POSTS
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
 * MODERATION ACTIONS (thin wrappers)
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
  markFulfilled
};
