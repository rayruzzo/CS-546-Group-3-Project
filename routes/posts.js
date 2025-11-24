import Router from 'express';
import postData from '../data/index.js'
import loadPosts from '../scripts/loadPosts.js';

const router = Router();

router.get('/filter', async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        // Extract all possible filter parameters
        // Validate and clamp numeric parameters
        const rawDistance = parseInt(req.query.distance, 10);
        const distance = (!isNaN(rawDistance)) ? Math.max(1, Math.min(100, rawDistance)) : 10;
        const rawLimit = parseInt(req.query.limit, 10);
        const limit = (!isNaN(rawLimit)) ? Math.max(1, Math.min(100, rawLimit)) : 10;
        const rawSkip = parseInt(req.query.skip, 10);
        const skip = (!isNaN(rawSkip)) ? Math.max(0, Math.min(10000, rawSkip)) : 0;
        const filters = {
            distance: distance,
            category: req.query.category,
            type: req.query.type,
            tags: req.query.tags ? req.query.tags.split(',') : undefined,
            limit: limit,
            skip: skip
        };
        
        const filteredPosts = await loadPosts(req.session.user.zipCode, filters);
        
        res.json({ posts: filteredPosts });
    } catch (error) {
        console.error('Error filtering posts:', error);
        res.status(500).json({ error: 'Failed to filter posts' });
    }
});

router.get('/', async (req, res) => {
    try {
        res.end()
    } 
    catch (error) {
        res.end()
    }
});

router.get('/:id', async (req, res) => {
    try {
        const post = await postData.getPostById(req.params.id);
        // we will need to fetch the user data as well
        res.render('post', { title: post.title, post: post, user: post.user });
    } catch (error) {
        res.status(404).json({ error: error.toString() });
    }
});

router.post('/', async (req, res) => {
    try {
        const { title, userId, content, type, category, commentsEnabled, tags } = req.body;
        const newPost = await postData.createPost(title, userId, content, type, category, commentsEnabled, tags);
        res.json(newPost);
    } catch (error) {
        res.status(400).json({ error: error.toString() });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { title, userId, content, type, category, commentsEnabled, tags } = req.body;
        const updatedPost = await postData.updatePost(req.params.id, title, userId, content, type, category, commentsEnabled, tags);
        res.json(updatedPost);
    } catch (error) {
        res.status(404).json({ error: error.toString() });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const deletedPost = await postData.removePost(req.params.id);
        res.json(deletedPost);
    } catch (error) {
        res.status(404).json({ error: error.toString() });
    }
});

export default router;