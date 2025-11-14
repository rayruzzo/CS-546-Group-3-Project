import { ObjectId } from "mongodb";
import { posts } from "../mongoCollections.js"
import validators from "../validation.js"

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
    content,
    type,
    category,
    commentsEnabled,
    tags
) => {

    const validatedPost = _validatePost(title, userId, content, type, category, commentsEnabled, tags);

    const newPost = {
        id: new ObjectId(),
        title: validatedPost.title,
        userId: validatedPost.userId,
        content: validatedPost.content,
        type: validatedPost.type,
        category: validatedPost.category,
        commentsEnabled: validatedPost.commentsEnabled,
        tags: validatedPost.tags,
        createdAt: new Date(),
        updatedAt: new Date(),
        comments: [],
        //zipcode: user.getZipCode(userId)
    }


    const postCollection = await posts();
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
    const postCollection = await posts();
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

    if (!postList) throw "No posts found";
    return postList;
}

const removePost = async (id) => {
    id = validators.validateId(id, "Post ID");
    const postCollection = await posts();
    const deletionInfo = await postCollection.deleteOne({ _id: new ObjectId(id) });

    if (deletionInfo.deletedCount === 0) {
        throw `Could not delete post with id of ${id}`;
    }

    return { post: id, deleted: true };
}

const updatePost = async (id, title, userId, content, type, category, commentsEnabled, tags) => {
    id = validators.validateId(id, "Post ID");
    const validatedPost = _validatePost(title, userId, content, type, category, commentsEnabled, tags);
    const postCollection = await posts();
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
        throw "Could not update post";
    }
    return await getPostById(id);
}

const postFunctions = {
    createPost,
    getPostById,
    getNPosts,
    removePost,
    updatePost
};

export default postFunctions;