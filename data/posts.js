import { ObjectId } from "mongodb";
import db from "../config/mongoCollections.js"
import validators from "../validation.js"
import locationData from "./locations.js"

const postTypes = {
    OFFER: "offer",
    REQUEST: "request"
}

const postCategories = {
    TRANSPORT: "transport",
    HOUSING: "housing",
    SERVICES: "services",
    GOODS: "goods",
    FOOD: "food",
    PET: "pet care",
    CHILD: "child care",
    ELDER: "elder care",
    EDUCATION: "education",
    EVENT: "event",
    TOOL: "tool",
    REPAIR: "repair",
    LAND: "landcare",
    OTHER: "other"
}

const _validateCategory = (category) => {
    category = validators.validateString(category, "Post Category");
    const validCategories = Object.values(postCategories);
    if (!validCategories.includes(category)) {
        throw "Invalid category";
    }
    return category;
}

const _validateType = (type) => {
    type = validators.validateString(type, "Post Type");
    const validTypes = Object.values(postTypes);
    if (!validTypes.includes(type)) {
        throw "Invalid type";
    }
    return type;
}

const _validatePost = (title, userId, content, type, category, commentsEnabled, tags) => {
    title = validators.validateString(title, "Title");
    userId = validators.validateId(userId, "User ID");
    content = validators.validateString(content, "Content");
    type = _validateType(type);
    category = _validateCategory(category);
    commentsEnabled = validators.validateBoolean(commentsEnabled, "Comments Enabled");
    tags = validators.validateArray(tags, "Tags");

    return {
        title,
        userId,
        content,
        type,
        category,
        commentsEnabled,
        tags
    };
}

const createPost = async (
    title,
    userId, 
    zipcode,
    content,
    type,
    category,
    commentsEnabled,
    tags
) => {

    const validatedPost = _validatePost(title, userId, content, type, category, commentsEnabled, tags);

    // Get location data for the zipcode - it already has the loc field
    const location = await locationData.getLocationByZipcode(zipcode);
    
    const newPost = {
        title: validatedPost.title,
        userId: validatedPost.userId,
        zipcode: zipcode,
        content: validatedPost.content,
        type: validatedPost.type,
        category: validatedPost.category,
        commentsEnabled: validatedPost.commentsEnabled,
        tags: validatedPost.tags,
        createdAt: new Date(),
        updatedAt: new Date(),
        comments: [],
        loc: location.loc  // Use the loc field directly from locations collection
    }


    const postCollection = await db.posts();
    const insertInfo = await postCollection.insertOne(newPost);
    if (!insertInfo.acknowledged || !insertInfo.insertedId) {
        throw "Could not add post";
    }

    const newId = insertInfo.insertedId.toString();
    const post = await getPostById(newId);
    return post;
}

const getPostById = async (id) => {
    id = validators.validateId(id, "Post ID");
    const postCollection = await db.posts();
    const post = await postCollection.findOne({ _id: new ObjectId(id) });
    if (!post) throw "Post not found";
    return post;
}

const getNPosts = async (n, skip = 0) => {
    if (!n || typeof n !== "number" || n <= 0) {
        throw "Invalid number of posts requested";
    }

    const postCollection = await posts();
    const postList = await postCollection.find({}).skip(skip).limit(n).toArray();

    if (postList.length === 0) throw "No posts found";

    return postList;
}

const removePost = async (id) => {
    id = validators.validateId(id, "Post ID");
    const postCollection = await db.posts();
    const deletionInfo = await postCollection.deleteOne({ _id: new ObjectId(id) });

    if (deletionInfo.deletedCount === 0) {
        throw `Could not delete post with id of ${id}`;
    }

    return { post: id, deleted: true };
}

const updatePost = async (id, title, userId, content, type, category, commentsEnabled, tags) => {
    id = validators.validateId(id, "Post ID");
    const validatedPost = _validatePost(title, userId, content, type, category, commentsEnabled, tags);
    const postCollection = await db.posts();
    const updatedPost = {
        title: validatedPost.title,
        userId: validatedPost.userId,
        content: validatedPost.content,
        type: validatedPost.type,
        category: validatedPost.category,
        commentsEnabled: validatedPost.commentsEnabled,
        tags: validatedPost.tags,
        updatedAt: new Date()
    };
    const updateInfo = await postCollection.updateOne({ _id: new ObjectId(id) }, { $set: updatedPost });
    if (updateInfo.modifiedCount === 0) {
        throw new Error("Invalid category");  
    }
    return await getPostById(id);
}

const getPostsNearZipcode = async (zipcode, radiusMiles = 5, limit = 10, skip = 0) => {
    const location = null;
    try {
        location = await locationData.getLocationByZipcode(zipcode);
    } catch (err) {
        throw err;
    }
    
    limit = validateWholeNumber(limit, "Limit");
    skip = validateWholeNumber(skip, "Skip");
    radiusMiles = validateWholeNumber(radiusMiles, "Radius");

    const radiusMeters = radiusMiles * 1609.34;

    const postCollection = await db.posts();
    
    // Use $near for geospatial query - automatically sorts by distance
    if (!location || !location.loc) {
        throw "Location data not found for the given zipcode";
    }
    
    const posts = await postCollection
        .find({
            loc: {
                $near: {
                    $geometry: location,
                    $maxDistance: radiusMeters
                }
            }
        })
        .skip(skip)
        .limit(limit)
        .toArray();

    return posts;
}

const filterPosts = async (filters = {}) => {
    /*
     * filters object can include:
     * - zipcode: string (center zipcode for radius search)
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
        const location = await locationData.getLocationByZipcode(zipcode);
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

    if (category) {
        query.category = _validateCategory(category);
    }

    if (type) {
        query.type = _validateType(type);
    }

    if (tags && Array.isArray(tags) && tags.length > 0) {
        query.tags = { $in: tags };
    }

    if (userId) {
        query.userId = validators.validateId(userId, "User ID");
    }

    const postCollection = await db.posts();
    
    // Note: When using $near, results are automatically sorted by distance
    // Cannot use .sort() with $near
    const posts = await postCollection
        .find(query)
        .skip(skip)
        .limit(limit)
        .toArray();

    return posts;
}

const postFunctions = {
    createPost,
    getPostById,
    getNPosts,
    removePost,
    updatePost,
    filterPosts,
    getPostsNearZipcode
};

export default postFunctions;