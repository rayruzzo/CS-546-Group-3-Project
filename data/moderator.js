import db from "../config/mongoCollections.js";
import postData from "./posts.js";

const { posts } = db;

const moderatorData = {

  /****************************************************************************
   * getReportedPosts
   * --------------------------------------------------------------------------
   * Retrieves all posts that have been flagged as reported.
   *
   * Notes:
   * - Read-only operation
   * - Does not mutate post state
   * - Reuses existing post enrichment logic
   ****************************************************************************/
  async getReportedPosts() {
    const postCollection = await posts();

    const reportedPosts = await postCollection
      .find({ reported: true })
      .sort({ createdAt: -1 })
      .toArray();

    return await postData.enrichPostsWithUserAndLocation(reportedPosts);
  }

  
};

export default moderatorData;
