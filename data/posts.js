import { ObjectId } from "mongodb";
import db from "../config/mongoCollections.js"
import { postSchema, priorityValues } from "../models/posts.js";
import validators from "../validation.js"
import locationFunctions from "./locations.js";
import userFunctions from "./users.js";

const { posts } = db;

const Post = Object.freeze(class Post {
    _id;
    title;
    userId;
    content;
    type;
    category;
    commentsEnabled;
    tags=[];
    priority = priorityValues.NORMAL;
    expiresAt = null;


    constructor({ _id, title, userId, content, type, category, commentsEnabled, tags, priority, expiresAt }) {
        this._id = _id;
        this.title = title;
        this.userId = userId;
        this.content = content;
        this.type = type;
        this.category = category;
        this.commentsEnabled = commentsEnabled;
        this.tags = tags;
        this.priority = priority || priorityValues.NORMAL;
        this.expiresAt = expiresAt || null;

        this.createdAt = new Date();
        this.updatedAt = new Date();
        this.comments = [];
        
        // zipcode and loc will be set in createPost function
        this.zipcode = "";
        this.loc = null;
    }
});

const postFunctions = {
    // Helper function to check and update expired posts
    async checkAndUpdateExpiredPost(post) {
        // Set default fulfilledState if missing
        if (!post.fulfilledState) {
            const postCollection = await posts();
            await postCollection.updateOne(
                { _id: post._id },
                { $set: { fulfilledState: 'open' } }
            );
            post.fulfilledState = 'open';
        }

        // Check if post has expired
        if (post.expiresAt && post.fulfilledState === 'open') {
            const now = new Date();
            if (new Date(post.expiresAt) < now) {
                // Post has expired, update it
                const postCollection = await posts();
                await postCollection.updateOne(
                    { _id: post._id },
                    { $set: { fulfilledState: 'expired' } }
                );
                post.fulfilledState = 'expired';
            }
        }
        return post;
    },

    async createPost(title, userId, content, type, category, commentsEnabled, tags, priority, expiresAt) {
        const errors = {};

        // Get user's zipcode from database
        const userResult = await userFunctions.getUserById(userId);
        const user = userResult.user;

        const newPostData = new Post({
            title,
            userId,
            content,
            type,
            category,
            commentsEnabled,
            tags,
            priority,
            expiresAt
        });

        // Get location data for the user's zipcode
        const location = await locationFunctions.getLocationByZipcode(user.zipcode);
        if (!location || !location.loc) {
            throw new Error("Location data not found for user's zipcode", {
                cause: { zipcode: user.zipcode }
            });
        }

        // Add location data to post
        newPostData.zipcode = user.zipcode;
        newPostData.loc = location.loc;
        newPostData.fulfilledState = 'open';

        const validatedPost = await postSchema.validate(newPostData);
        
        const postCollection = await posts();
        const insertInfo = await postCollection.insertOne(validatedPost);
        if (!insertInfo.acknowledged) {
            errors.creationError = "Could not create a new post";
        }



        console.log("NEW POST CREATED");

        return { post: newPostData, success: true };
    },

    async getPostById(id) {
        if (!id) throw new Error("Post ID must be provided", { cause: { id: "Post ID not provided" } });
        
        const postCollection = await posts();
        let post = await postCollection.findOne({ _id: ObjectId.createFromHexString(id) });
        if (!post) throw new Error("Post not found", { cause: { id: "No post found with the provided ID" } });

        // Check and update if expired
        post = await this.checkAndUpdateExpiredPost(post);

        const enrichedPost = await this.enrichPostWithUserAndLocation(post);

        return { post: enrichedPost, success: true };
    },

    async updatePost(postId, postData) {
        if (!postId) throw new Error("Post ID must be provided", { cause: { postId: "Post ID not provided" } });
        if (!postData || Object(postData) !== postData) throw new Error("Post data must be provided", { cause: { postData: "Post data not provided" } });

        postData = await postSchema.validate(postData);

        const postCollection = await posts();
        const updateInfo = await postCollection.updateOne(
            { _id: ObjectId.createFromHexString(postId) },
            { $set: {...postData }}
        );

        if (updateInfo.matchedCount === 0) { throw new Error("Post not found", { cause: { postId: "No post found with the provided ID" } }); }
        if (updateInfo.modifiedCount === 0) {
            throw new Error("Could not update post successfully", { cause: { postId: "Post update failed" } });
        }
        return { post: await this.getPostById(postId), success: true };
    },

    async deletePost(postId) {
        if (!postId) throw new Error("Post ID must be provided", { cause: { postId: "Post ID not provided" } });
        
        const postCollection = await posts();
        const deletionInfo = await postCollection.deleteOne({ _id: ObjectId.createFromHexString(postId) });

        if (deletionInfo.deletedCount === 0) {
            throw new Error("Could not delete post", { cause: { postId: "Post deletion failed" } });
        }

        return { postId: postId, deleted: true, success: true };
    },

    async getPostsNearZipcode(zipcode, radiusMiles = 5, limit = 10, skip = 0) {
        const location = await locationFunctions.getLocationByZipcode(zipcode);
        
        limit = validators.validateWholeNumber(limit, "Limit");
        skip = validators.validateWholeNumber(skip, "Skip");
        radiusMiles = validators.validateWholeNumber(radiusMiles, "Radius");
        
        const radiusMeters = radiusMiles * 1609.34;
        const postCollection = await posts();
        
        
        const postsList = await postCollection
            .find({
                loc: {
                    $near: {
                        $geometry: location.loc,
                        $maxDistance: radiusMeters
                    }
                }
            })
            .skip(skip)
            .limit(limit)
            .toArray();
    
        return postsList;
    },
    async filterPosts(filters = {}) {
        /*
         * filters object can include:
         * - zipcode: string (center zipcode for radius search)
         * - zipCodes: array of strings (filter by multiple zipcodes)
         * - radius: number (distance in miles for radius search)
         * - category: string (post category)
         * - type: string (offer or request)
         * - tags: array of tags (matches any)
         * - priority: string (low, normal, high, urgent)
         * - expiring: string (24h, 3d, 7d - posts expiring within timeframe)
         * - userId: string (posts by specific user)
         * - sortBy: string (distance, newest, oldest, expiration, priority)
         * - limit: number (default 10)
         * - skip: number (default 0)
         */
        
        const { 
            zipcode,
            zipCodes,
            radius,
            category, 
            type, 
            tags,
            priority,
            expiring,
            userId,
            sortBy = 'newest',
            limit = 10, 
            skip = 0 
        } = filters;
    
        // Build MongoDB query dynamically
        const query = {};
    
        // Handle geospatial filtering if zipcode and radius provided
        if (zipcode && radius) {
            const location = await locationFunctions.getLocationByZipcode(zipcode);
            const radiusMeters = radius * 1609.34; // Convert miles to meters
            
            query.loc = {
                $near: {
                    $geometry: {
                        type: "Point",
                        coordinates: [location.longitude, location.latitude]
                    },
                    $maxDistance: radiusMeters
                }
            };
        }
        // Handle filtering by multiple zipcodes
        else if (zipCodes && Array.isArray(zipCodes) && zipCodes.length > 0) {
            query.zipcode = { $in: zipCodes };
        }
    
        if (category) {
            query.category = category;
        }
    
        if (type) {
            query.type = type;
        }
    
        if (tags && Array.isArray(tags) && tags.length > 0) {
            query.tags = { $in: tags };
        }
    
        if (priority) {
            query.priority = priority;
        }
    
        if (expiring) {
            const now = new Date();
            let expirationDate;
            
            if (expiring === '24h') {
                expirationDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            } else if (expiring === '3d') {
                expirationDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
            } else if (expiring === '7d') {
                expirationDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            }
            
            if (expirationDate) {
                query.expiresAt = {
                    $ne: null,
                    $gte: now,
                    $lte: expirationDate
                };
            }
        }
    
        if (userId) {
            query.userId = userId;
        }
    
        // Build sort options
        let sortOptions = {};
        
        if (sortBy === 'newest') {
            sortOptions = { createdAt: -1 };
        } else if (sortBy === 'oldest') {
            sortOptions = { createdAt: 1 };
        } else if (sortBy === 'expiration') {
            sortOptions = { expiresAt: 1 };
        } else if (sortBy === 'priority') {
            sortOptions = { priority: -1, createdAt: -1 }; // Sort by priority desc, then newest
        } else if (sortBy === 'distance') {
            // Distance sorting is already handled by $near query
            sortOptions = { createdAt: -1 }; // Secondary sort by newest
        }
    
        const postCollection = await posts();
        const postsList = await postCollection
            .find(query)
            .sort(sortOptions)
            .skip(skip)
            .limit(limit)
            .toArray();
    
        return postsList;
    },

    async enrichPostWithUserAndLocation(post) {
        try {
            // Check and update if expired
            post = await this.checkAndUpdateExpiredPost(post);

            // Get user info for the post's userId
            const userResult = await userFunctions.getUserById(post.userId);
            const user = userResult.user;
            
            // Get location info for the post's zipcode
            const postLocation = await locationFunctions.getLocationByZipcode(post.zipcode);
            
            // Format date
            const datePosted = post.createdAt ? new Date(post.createdAt).toLocaleDateString() : 'Unknown';
            
            return {
                ...post,
                _id: post._id.toString(),
                username: user.profile?.username || 'Anonymous',
                city: postLocation.city,
                state: postLocation.state_code,
                datePosted: datePosted
            };
        } catch (error) {
            console.error(`Error enriching post ${post._id}:`, error.message);
            // Return post with fallback values if enrichment fails
            return {
                ...post,
                _id: post._id.toString(),
                username: 'Unknown',
                city: 'Unknown',
                state: 'Unknown',
                datePosted: 'Unknown'
            };
        }
    },

    async enrichPostsWithUserAndLocation(postsList) {
        const enrichedPosts = [];
        
        for (const post of postsList) {
            const enrichedPost = await this.enrichPostWithUserAndLocation(post);
            enrichedPosts.push(enrichedPost);
        }
        
        return enrichedPosts;
    },

    async markPostAsFulfilled(postId) {
        if (!postId) throw new Error("Post ID must be provided", { cause: { postId: "Post ID not provided" } });

        const postCollection = await posts();
        const updateInfo = await postCollection.updateOne(
            { _id: ObjectId.createFromHexString(postId) },
            { $set: { fulfilledState: 'fulfilled', updatedAt: new Date() } }
        );

        if (updateInfo.matchedCount === 0) { throw new Error("Post not found", { cause: { postId: "No post found with the provided ID" } }); }
        if (updateInfo.modifiedCount === 0) {
            throw new Error("Could not mark post as fulfilled", { cause: { postId: "Post update failed" } });
        }
        return { postId: postId, fulfilled: true, success: true };
    }

};

export default postFunctions;