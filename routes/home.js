import Router from 'express';
import loadPosts from '../scripts/loadPosts.js';

const router = Router();

router.get('/', async (req, res) => {
    try {
        // Check if user is authenticated
        if (!req.session.user) {
            return res.render('home', { 
                title: 'Welcome',
                user: null 
            });
        }

        // Load posts for authenticated user based on their zip code
        let posts = [];
        try {
            posts = await loadPosts(req.session.user.zipcode, { limit: 20 });
        } catch (error) {
            console.error('Error loading posts:', error.message);
        }
        
        res.render('home', { 
            title: 'Home',
            user: req.session.user,
            posts: posts,
        });
    } catch (error) {
        console.error('Error loading home page:', error);
        res.status(500).render('home', {
            title: 'Home',
            user: req.session.user || null,
            posts: [],
            error: 'Failed to load posts'
        });
    }
});

export default router;
