import { ObjectId } from "mongodb";
import db from "../config/mongoCollections.js"
import validators from "../validation.js"

const _validateComment = (postId,authorId,content) =>{
    postId = validators.validateId(postId, "Post ID");
    autherId = validators.validateId(authorId,"Author ID");
    content = validators.validateString(content,"Comment content");
    return {postId,autherId,content};
}

//Create comment
const createComment = async (postId,authorId,content) =>{
    const validated = _validateComment(postId,authorId,content);
    const newComment = {
        postId:validated.postId,
        authorId:validated.autherId,
        content: validated.content,
        createdAt: new Date(),
        updatedAt: new Date()
    }
    const commentsCollection = await db.comments();
    const insertInfo = await commentsCollection.insertOne(newComment);
    if (!insertInfo.acknowledged || !insertInfo.insertedId) {
        throw "Could not add comment";
    }
    const newId = insertInfo.insertedId.toString();
    const postCollection = await db.posts();
    const updatePost = await postCollection.updateOne(
        {_id:new ObjectId(post)},
        {$push : {comments: newId}}
    );
    if(updatePost.modifiedCount === 0){
        throw "Failed to attach comment to post";
    }

  return getCommentById(newId);
}


const getCommentById = async (id)=>{
    id = validators.validateId(id,"Comment ID");
    const commentsCollection = await db.comments();
    const comment = commentsCollection.findOne({_id:new ObjectId(id)});
    if(!comment) throw "Comment not found!";
    return comment;
}

const getCommentsByPostId = async (postId)=>{
    postId = validators.validateId(id,"Post ID");

    const commentsCollection = await db.comments();
    const comments = await commentsCollection.find({postId}).toArray();
 
    return comments;
}

//Remove Comment

const removeComment = async (id)=>{
    id = validators.validateId(id,"Comment ID");
    const commentsCollection = await db.comments();
    const deletionInfo = await commentsCollection.deleteOne({_id: new ObjectId(id)});

    if(deletionInfo.deletedCount === 0){
        throw `Could not delete comment with id : ${id}`;
    }
    //Remove comment from the post.comments[]
    const postCollection = await db.posts();
    await postCollection.updateMany(
        {comments : id},
        {$pull:{comments: id}}
    );

    return {comment : id, deleted : true};
}


const updateComment = async (id,content)=>{
    id = validators.validateId(id,"Comment ID");
    comment = validators.validateString(content,"Upadated comment content");

    const commentsCollection = await db.comments();
    const updated ={content,updatedAt:new Date()};

    const updadateInfo = await commentsCollection.updateOne({_id: new ObjectId(id)},{$set:updated});


    if(updadateInfo.modifiedCount === 0){
        throw `Unable to update comment!`;
    }
    return getCommentById(id);
}

const commentFunctions={
    createComment,
    getCommentById,
    getCommentsByPostId,
    removeComment,
    updateComment
};

export default commentFunctions;