import {postTypeSchema, postCategorySchema, tagsSchema, prioritySchema} from '../models/posts.js';
import postData from '../data/posts.js';
import userData from "../data/users.js";
import { renderErrorPage } from '../utils/errorUtils.js';

const isPostOwnerAction = async (req, res, next) => {
    try {
        const userId = req.session.user._id;
        const { post } = await postData.getPostById(req.params.id);
        if (userId !== post.userId.toString()) {
            return res.status(403).redirect(`/posts/${req.params.id}`);
        }
        req.post = post;
        next();
    } catch (error) {
        return res.status(404).json({ error: 'Post not found' });
    }
};

const isPostOwnerDisplay = async (req, res, next) => {
    try {
        const userId = req.session.user._id;
        const { post } = await postData.getPostById(req.params.id);
        req.post = post;
        res.locals.isPostOwner = (userId === post.userId.toString());
        next();
    } catch (error) {
        return res.status(404).json({ error: 'Post not found' });
    }
}

const isProfileOwnerDisplay = async (req, res, next) => {
    try {

        const userId = req.session?.user?._id;
        const { user } = await userData.getUserByUsername(req.params.username.toLowerCase());
        
        res.locals.sessionUserId   = userId.toString();
        res.locals.requestedUserId = user._id.toString();
        res.locals.requestedUser   = user;
        res.locals.isPostOwner = (res.locals.sessionUserId === res.locals.requestedUserId);
        
        next();
    } catch (error) {
        console.error(error);
        return renderErrorPage(res, 404, error.message);
    }
}

const requireAuthentication = (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/login');
          }
    next();
}

const parseFilterParams = (req, res, next) => {
    const rawDistance = parseInt(req.query.distance, 10);
    const distance = (!isNaN(rawDistance)) ? Math.max(1, Math.min(100, rawDistance)) : 10;
    
    const rawLimit = parseInt(req.query.limit, 10);
    const limit = (!isNaN(rawLimit)) ? Math.max(1, Math.min(100, rawLimit)) : 10;
    
    const rawSkip = parseInt(req.query.skip, 10);
    const skip = (!isNaN(rawSkip)) ? Math.max(0, Math.min(10000, rawSkip)) : 0;
    
    const category = req.query.category;
    if (category && !postCategorySchema.isValidSync(category)) {
        return res.status(400).json({ error: 'Invalid category filter' });
    }
    
    const type = req.query.type;
    if (type && !postTypeSchema.isValidSync(type)) {
        return res.status(400).json({ error: 'Invalid type filter' });
    }

    const tags = req.query.tags;
    if (tags) {
        const tagsArray = tags.split(',');
        if (!tagsSchema.isValidSync(tagsArray)) {
            return res.status(400).json({ error: 'Invalid tags filter' });
        }
        if (tagsArray.length > 20) {
            return res.status(400).json({ error: 'Too many tags filter' });
        }
    }
    
    const rawPriority = parseInt(req.query.priority, 10);
    const priority = (!isNaN(rawPriority) && prioritySchema.isValidSync(rawPriority)) ? rawPriority : undefined;
    
    const expiring = req.query.expiring;
    const validExpiringValues = ['24h', '3d', '7d'];
    if (expiring && !validExpiringValues.includes(expiring)) {
        return res.status(400).json({ error: 'Invalid expiring filter. Must be 24h, 3d, or 7d' });
    }
    
    const sortBy = req.query.sortBy || 'newest';
    const validSortValues = ['distance', 'newest', 'oldest', 'expiration', 'priority'];
    if (!validSortValues.includes(sortBy)) {
        return res.status(400).json({ error: 'Invalid sortBy value' });
    }

    req.filters = {
        distance: distance,
        category: category,
        type: type,
        tags: tags ? tags.split(',').map(t => t.trim()).filter(t => t.length > 0) : undefined,
        priority: priority,
        expiring: expiring,
        sortBy: sortBy,
        limit: limit,
        skip: skip
    };
    
    next();                 
};

export default {
     isPostOwnerAction,
     isPostOwnerDisplay,
     isProfileOwnerDisplay,
     requireAuthentication, 
     parseFilterParams 
    };