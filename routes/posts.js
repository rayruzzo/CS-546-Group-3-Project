import Router from 'express';
import postData from '../data/posts.js';
import loadPosts from '../scripts/loadPosts.js';
import { renderErrorPage } from '../utils/errorUtils.js';
import postMiddleware from '../middleware/posts.mw.js';

const router = Router();

// GET /posts/filter - Filter posts (API endpoint for AJAX)
router.get('/filter', async (req, res) => {
    try {
        const filteredPosts = await loadPosts(req.session.user.zipcode, req.filters);
        res.json({ posts: filteredPosts });
    } catch (error) {
        console.error('Error filtering posts:', error);
        renderErrorPage(res, 500, error.message || 'Failed to filter posts');
    }
});

// GET /posts/create - Show create post page
router.get('/create', async (req, res) => {
    try {
        res.render('createPost', { title: "Create New Post" });
    } catch (error) {
        renderErrorPage(res, 500, error.toString());
    }
});

// POST /posts/create - Create a new post and redirect to it
router.post('/create', async (req, res) => {
    try {
        const { title, content, type, category, commentsEnabled, tags, priority, expiresAt } = req.body;
        const userId = req.session.user._id;

        const { post } = await postData.createPost(title, userId, content, type, category, commentsEnabled, tags, priority, expiresAt);
        res.redirect(`/posts/${post._id}`);
    } catch (error) {
        renderErrorPage(res, 400, error.message);
    }
});

// GET /posts/edit/:id - Show edit post page
router.get('/edit/:id', postMiddleware.isPostOwnerAction, async (req, res) => {
    try {
        res.render('editPost', { post: req.post, title: "Edit Post" });
    } catch (error) {
        renderErrorPage(res, 404, error.toString());
    }
});

// POST /posts/edit/:id - edit post and redirect to it
router.post('/edit/:id', postMiddleware.isPostOwnerAction, async (req, res) => {
    try {
        const {
            title,
            content,
            type,
            category,
            commentsEnabled,
            tags,
            priority,
            expiresAt,
            fulfilledState
        } = req.body;

        const post = req.post;

        const editedPostData = {
            title,
            userId: post.userId,
            zipcode: post.zipcode,
            loc: post.loc,
            content,
            type,
            category,
            commentsEnabled,
            tags,
            priority: priority || post.priority,
            expiresAt,
            fulfilledState,
            editedAt: new Date()
        };

        await postData.updatePost(req.params.id, editedPostData);
        res.redirect(`/posts/${req.params.id}`);
    } catch (error) {
        renderErrorPage(res, 400, error.message);
    }
});

// GET /posts/:id - View a single post
router.get('/:id', postMiddleware.isPostOwnerDisplay, async (req, res) => {
    try {
        res.render('partials/post', { post: req.post});
    } catch (error) {
        renderErrorPage(res, 404, error.toString());
    }
});

// DELETE /posts/:id - Delete a post
router.delete('/delete/:id', postMiddleware.isPostOwnerAction, async (req, res) => {
    try {
        await postData.deletePost(req.params.id);
        return res.status(200).json({ success: true, message: 'Post deleted' });
    } catch (error) {
        renderErrorPage(res, 404, error.toString());
    }
});

router.post('/fulfill/:id', postMiddleware.isPostOwnerAction, async (req, res) => {
    try {
        await postData.markPostAsFulfilled(req.params.id);
        return res.status(200).json({ success: true, message: 'Post marked as fulfilled' });
    } catch (error) {
        renderErrorPage(res, 404, error.toString());
    }
});

router.post('/report/:id', async (req, res) => {
    try {
        await postData.reportPost(req.params.id);
        res.redirect(`/posts/${req.params.id}`);
    } catch (error) {
        renderErrorPage(res, 404, error.toString());
    }
});

export default router;
