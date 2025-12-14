import Router from 'express';
import commentData from '../data/comments.js';
import { renderErrorPage } from '../utils/errorUtils.js';
const router = Router();

// POST /comments/create/:postId - Create a new comment for a post
router.post('/create/:postId', async (req, res) => {
    try {
        const postId = req.params.postId;
        const userId = req.session.user._id;
        const { content } = req.body;

        await commentData.createComment(postId, userId, content);
        res.redirect(`/posts/${postId}`);
    } catch (error) {

        renderErrorPage(res, 400, error.message || 'Failed to create comment');
    }
});

router.get('/edit/:id', async (req, res) => {
    try {
        const commentId = req.params.id;
        const comment = await commentData.getCommentById(commentId);
        res.render('editComment', { comment });
    } catch (error) {
        renderErrorPage(res, 404, error.toString());
    }
});

// POST /comments/edit/:id - Edit a comment
router.post('/edit/:id', async (req, res) => {
    try {
        const commentId = req.params.id;
        const { content } = req.body;

        const updatedComment = await commentData.updateComment(commentId, content);
        res.redirect(`/posts/${updatedComment.postId}`);
    } catch (error) {
        renderErrorPage(res, 400, error.message);
    }
});

// DELETE /comments/delete/:id - Delete a comment
router.delete('/delete/:id', async (req, res) => {
    try {
        const commentId = req.params.id;
        const deletedInfo = await commentData.removeComment(commentId);
        res.json(deletedInfo);
    } catch (error) {
        renderErrorPage(res, 400, error.message || 'Failed to delete comment');
    }
});

export default router;