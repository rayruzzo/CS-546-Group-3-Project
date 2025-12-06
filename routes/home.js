import Router from 'express';
import loadPosts from '../scripts/loadPosts.js';
import { postTypes, postCategories, priorityValues } from '../models/posts.js';

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
            posts = await loadPosts(req.session.user.zipcode, { limit: 10 });
        } catch (error) {
            console.error('Error loading posts:', error.message);
        }
        
        // Format categories and priorities for the template
        const categories = Object.entries(postCategories).map(([key, value]) => ({
            value: value,
            label: value.charAt(0).toUpperCase() + value.slice(1)
        }));
        
        const priorities = Object.entries(priorityValues).map(([key, value]) => ({
            value: value,
            label: key.charAt(0) + key.slice(1).toLowerCase()
        }));
        
        res.render('home', { 
            title: 'Home',
            user: req.session.user,
            posts: posts,
            categories: categories,
            postTypes: Object.values(postTypes),
            priorityValues: priorities
        });
    } catch (error) {
        console.error('Error loading home page:', error);
       res.status(500).render('home', {
            title: 'Home',
            user: req.session.user || null,
            posts: [],
            error: 'Failed to load posts',
            categories: categories,
            postTypes: Object.values(postTypes),
            priorityValues: priorities
        });
    }
});

export default router;
