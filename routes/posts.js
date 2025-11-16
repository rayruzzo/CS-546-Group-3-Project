import Router from 'express';
import postData from '../data/index.js'

const router = Router();

router.get('/', async (req, res) => {
    try {
        // Implementation for getting posts will go here
    } 
    catch (error) {
        res.status(404).json({ error: error.toString() });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const post = await postData.getPostById(req.params.id);
        // we will need to fetch the user data as well
        res.render('post', { post, user: post.user });
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
        res.status(404).json({ error: error.toString() });
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

const postRouter = router;
export default postRouter;