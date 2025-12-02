import { ObjectId } from "mongodb";
import db from "../config/mongoCollections.js"
import { postSchema } from "../models/posts.js";
import validators from "../validation.js"
import locationFunctions from "./locations.js";

const { posts } = db;

const Post = Object.freeze(class Post {
    _id;
    title;
    userId;
    content;
    type;
    category;
    commentsEnabled;
    tags;


    constructor({ _id, title, userId,  content, type, category, commentsEnabled, tags }) {
        this._id = _id;
        this.title = title;
        this.userId = userId;
        this.content = content;
        this.type = type;
        this.category = category;
        this.commentsEnabled = commentsEnabled;
        this.tags = tags;

        this.createdAt = new Date();
        this.updatedAt = new Date();
        this.comments = [];
        
        // zipcode and loc will be set in createPost function
        this.zipcode = "";
        this.loc = null;
    }
});

const postFunctions = {
    async createPost(title, userId, content, type, category, commentsEnabled, tags) {
        const errors = {};

        // Get user's zipcode from database
        const userFunctions = (await import('./users.js')).default;
        const { user } = await userFunctions.getUserById(userId);
        
        if (!user || !user.zipcode) {
            throw new Error("User zipcode not found", {
                cause: { userId: "Cannot create post without user zipcode" }
            });
        }

        const newPostData = new Post({
            title,
            userId,
            content,
            type,
            category,
            commentsEnabled,
            tags
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

        const validatedPost = await postSchema.validate(newPostData);
        
        const postCollection = await posts();
        const insertInfo = await postCollection.insertOne(validatedPost);
        if (!insertInfo.insertedId)
        errors.creationError = "Could not create a new post";

        if (Object.keys(errors).length > 0) {
        throw new Error("Error creating post", {
            cause: {errors: errors}
        });
        }

        console.log("NEW POST CREATED");

        return { post: newPostData, success: true };
    },

    async getPostById(id) {
        if (!id) throw new Error("Post ID must be provided", { cause: { id: "Post ID not provided" } });
        
        const postCollection = await posts();
        const post = await postCollection.findOne({ _id: ObjectId.createFromHexString(id) });
        if (!post) throw new Error("Post not found", { cause: { id: "No post found with the provided ID" } });

        // Enrich post with user and location info
        const enrichedPost = await this.enrichPostWithUserAndLocation(post);

        return { post: enrichedPost, success: true };
    },

    async updatePost(postId, validPostData) {
        if (!postId) throw new Error("Post ID must be provided", { cause: { postId: "Post ID not provided" } });
        if (!validPostData || Object(validPostData) !== validPostData) throw new Error("Post data must be provided", { cause: { validPostData: "Post data not provided" } });

        const postCollection = await posts();
        const updateInfo = await postCollection.updateOne(
            { _id: ObjectId.createFromHexString(postId) },
            { $set: {...validPostData }}
        );

        if (updateInfo.matchedCount === 0) { throw new Error("Post not found", { cause: { postId: "No post found with the provided ID" } }); }
        if (updateInfo.modifiedCount === 0) {
            throw new Error("Could not update post successfully", { cause: { postId: "Post update failed" } });
        }
        return { post: this.getPostById(postId), success: true };
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
        
        if (!location || !location.loc) {
            throw new Error("Location data not found for the given zipcode");
        }
        
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
         * - userId: string (posts by specific user)
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
            userId,
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
    
        if (userId) {
            query.userId = userId;
        }
    
        const postCollection = await posts();
        const postsList = await postCollection
            .find(query)
            .skip(skip)
            .limit(limit)
            .toArray();
    
        return postsList;
    },

    async enrichPostWithUserAndLocation(post) {
        const userFunctions = (await import('./users.js')).default;
        
        try {
            // Get user info
            const { user } = await userFunctions.getUserById(post.userId);
            
            // Get location info for the post's zipcode
            const postLocation = await locationFunctions.getLocationByZipcode(post.zipcode);
            
            // Format the date
            const datePosted = new Date(post.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
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
                datePosted: new Date(post.createdAt).toLocaleDateString()
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
    }

};

export default postFunctions;