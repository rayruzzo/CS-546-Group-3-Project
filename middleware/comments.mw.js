import commentFunctions from "../data/comments.js";
import postFunctions from "../data/posts.js";

const isCommentOwnerAction = async (req, res, next) => {
    try {
        const userId = req.session.user._id;
        const comment = await commentFunctions.getCommentById(req.params.id);
        if (userId !== comment.userId.toString()) {
            return res.status(403).redirect(`/posts/${comment.postId}`);
        }
        req.comment = comment;
        next();
    } catch (error) {
        return res.status(404).json({ error: 'Comment not found' });
    }
};

const getCommentsForPostDisplay = async (req, res, next) => {
    try {
        const postId = req.params.id;
        const userId = req.session.user?._id;
        let comments = await commentFunctions.getCommentsForPost(postId, userId);
        console.log(`Found ${comments.length} comments for post ${postId}`);
        res.locals.comments = comments;
    } catch (error) {
        console.error('Error loading comments:', error.message);
        res.locals.comments = [];
    } finally {
        next();
    } 
};

export default {
    isCommentOwnerAction,
    getCommentsForPostDisplay
};