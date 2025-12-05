import Router from 'express';
import postData from '../data/posts.js';
import loadPosts from '../scripts/loadPosts.js';
import postMiddleware from '../middleware/posts.mw.js';

const router = Router();

// GET /posts/filter - Filter posts (API endpoint for AJAX)
router.get('/filter', async (req, res) => {
    try {
        const filteredPosts = await loadPosts(req.session.user.zipcode, req.filters);
        res.json({ posts: filteredPosts });
    } catch (error) {
        console.error('Error filtering posts:', error);
        res.status(500).json({ error: error.message || 'Failed to filter posts' });
    }
});

// GET /posts/create - Show create post page
router.get('/create', async (req, res) => {
    try {
        res.render('createPost');
    } catch (error) {
        res.status(500).json({ error: error.toString() });
    }
});

// POST /posts/create - Create a new post and redirect to it
router.post('/create', async (req, res) => {
    try {
        const { title, content, type, category, commentsEnabled, tags, priority, expiresAt } = req.body;
        const userId = req.session.user._id;
        
        const tagsArray = tags ? tags.split(',').map(tag => tag.trim()) : [];
        const priorityNum = priority ? parseInt(priority, 10) : undefined;
        const expiresAtDate = expiresAt ? new Date(expiresAt) : null;
        
        const { post } = await postData.createPost(title, userId, content, type, category, commentsEnabled, tagsArray, priorityNum, expiresAtDate);
        res.redirect(`/posts/${post._id}`);
    } catch (error) {
        res.status(400).render('createPost', { error: error.message });
    }
});

// GET /posts/update/:id - Show update post page
router.get('/update/:id', async (req, res) => {
    try {
        const { post } = await postData.getPostById(req.params.id);
        res.render('updatePost', { post: post });
    } catch (error) {
        res.status(404).json({ error: error.toString() });
    }
});

// POST /posts/update/:id - Update post and redirect to it
router.post('/update/:id', async (req, res) => {
    try {
        const { title, content, type, category, commentsEnabled, tags, priority, expiresAt } = req.body;
        const { post } = await postData.getPostById(req.params.id);
        
        const tagsArray = tags ? tags.split(',').map(tag => tag.trim()) : [];
        const priorityNum = priority ? parseInt(priority, 10) : post.priority;
        const expiresAtDate = expiresAt ? new Date(expiresAt) : null;
        
        const updatedPostData = {
            title,
            userId: post.userId,
            zipcode: post.zipcode,
            loc: post.loc,
            content,
            type,
            category,
            commentsEnabled: commentsEnabled === 'on' || commentsEnabled === true,
            tags: tagsArray,
            priority: priorityNum,
            expiresAt: expiresAtDate,
            updatedAt: new Date()
        };
        
        await postData.updatePost(req.params.id, updatedPostData);
        res.redirect(`/posts/${req.params.id}`);
    } catch (error) {
        res.status(400).render('updatePost', { post: await postData.getPostById(req.params.id).then(p => p.post), error: error.message });
    }
});

// GET /posts/:id - View a single post
router.get('/:id', postMiddleware.isPostOwnerDisplay, async (req, res) => {
    try {
        res.render('post', { post: req.post });
    } catch (error) {
        res.status(404).json({ error: error.toString() });
    }
});

// DELETE /posts/:id - Delete a post
router.delete('/:id', async (req, res) => {
    try {
        const deletedPost = await postData.deletePost(req.params.id);
        return res.render('/');
    } catch (error) {
        res.status(404).json({ error: error.toString() });
    }
});

export default router;