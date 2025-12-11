import { ObjectId } from "mongodb";
import db from "../config/mongoCollections.js"
import { commentSchema, commentContentSchema } from "../models/comments.js";
import { objectIdSchema } from "../models/users.js";

//Create comment
const createComment = async (postId,authorId,content) =>{
    const validated = await commentSchema.validate({postId, userId: authorId, content});
    const postCollection = await db.posts();
    const post =  await postCollection.findOne({_id: typeof validated.postId === ObjectId ? validated.postId : new ObjectId(validated.postId)});
    if (!post) {
        throw `Cannot create comment: post with ID ${validated.postId} does not exist.`;
    }

    if (!post.commentsEnabled)  {
        throw `Comments are disabled for this post.`;
    }

    const newComment = {
        postId:validated.postId,
        userId:validated.userId,
        content: validated.content,
        createdAt: new Date(),
        updatedAt: new Date()
    }
    
    const commentsCollection = await db.comments();
    const insertInfo = await commentsCollection.insertOne(newComment);
    if(insertInfo.insertedCount === 0){
        throw "Could not add comment";
    }
    
    const editPost = await postCollection.updateOne(
        {_id: typeof validated.postId === ObjectId ? validated.postId : new ObjectId(validated.postId)},
        {$push : {comments: insertInfo.insertedId.toString()}}
    );

    if(editPost.modifiedCount === 0){
        throw "Failed to attach comment to post";
    }

  return await getCommentById(insertInfo.insertedId);
}


const getCommentById = async (id)=>{
    id = typeof id === ObjectId ? id : new ObjectId(id);
    const commentsCollection = await db.comments();
    const comment = await commentsCollection.findOne({_id: id});

    if(!comment) throw "Comment not found!";
    return comment;
}

const removeComment = async (id)=>{
    id = typeof id === ObjectId ? id : new ObjectId(id);
    const commentsCollection = await db.comments();
    const postInfo = await getCommentById(id);

    if(!postInfo) throw "Comment not found";
    
    const postCollection = await db.posts();
    await postCollection.updateOne(
        {_id: new ObjectId(postInfo.postId)},
        {$pull:{comments: id}}
    );

    const deletionInfo = await commentsCollection.deleteOne({_id: new ObjectId(id)});

    if(deletionInfo.deletedCount === 0){
        throw `Could not delete comment with id : ${id}`;
    }
    return {comment : id, deleted : true};
}


const updateComment = async (id,content)=>{
    id = typeof id === ObjectId ? id : new ObjectId(id);
    content = await commentContentSchema.validate(content);
    const commentsCollection = await db.comments();
    const updated ={content,updatedAt:new Date()};

    const updatedInfo = await commentsCollection.updateOne({_id: new ObjectId(id)},{$set:updated});


    if(updatedInfo.modifiedCount === 0){
        throw `Unable to update comment!`;
    }
    return await getCommentById(id);
}

const flagOwnedComment = (comment, userId) => {
    comment.isOwner = comment.userId.toString() === userId;
    return comment;
};

const getCommentsForPost = async (postId, userId = null, skip = 0, limit = 100) => {

    try {

        postId = typeof postId === ObjectId ? postId : new ObjectId(postId);
        const postCollection = await db.posts();
        const post = await postCollection.findOne({ _id: postId });
        
        if (!post) {
            throw new Error('Post not found');
        }
        
        const commentList = post.comments || [];
        
        const commentsCollection = await db.comments();
        const usersCollection = await db.users();
        const validatedIds = await Promise.all(
            commentList.slice(skip, skip + limit).map(id => objectIdSchema.validate(id))
        );
        const commentIds = validatedIds.map(id => new ObjectId(id));
        const comments = await commentsCollection.find({ 
            _id: { $in: commentIds } 
        }).toArray();

        // Enrich comments with user data and ownership flag
        for (let comment of comments) {
            const user = await usersCollection.findOne({ _id: new ObjectId(comment.userId) });
            if (user) {
                comment.username = user.profile?.username || 'Unknown User';
            }
            comment.datePosted = comment.createdAt ? new Date(comment.createdAt).toLocaleDateString() : 'Unknown';
            
            if (userId) {
                flagOwnedComment(comment, userId);
            }
        }

        return comments;

    } catch (error) {
        throw new Error(`Error retrieving comments for post: ${error.message}`);
    }
    
}

const commentFunctions={
    createComment,
    getCommentById,
    removeComment,
    updateComment,
    flagOwnedComment,
    getCommentsForPost
};

export default commentFunctions;