import { ObjectId } from "mongodb";
import db from "../config/mongoCollections.js"
import validators from "../validation.js"

const _validateComment = (postId, authorId, content) => {
    postId = validators.validateId(postId, "Post ID");
    authorId = validators.validateId(authorId, "Author ID");
    content = validators.validateString(content, "Comment content");
    return { postId, authorId, content };
}

//Create comment
const createComment = async (postId,authorId,content) =>{
    const validated = _validateComment(postId,authorId,content);
    const post = await postCollection.findOne({ _id: new ObjectId(validated.postId) });
    if (!post) {
        throw `Cannot create comment: post with ID ${validated.postId} does not exist.`;
    }
    const newComment = {
        postId:validated.postId,
        authorId:validated.authorId,
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
        {_id:new ObjectId(postId)},
        {$push : {comments: newId}}
    );
    if(updatePost.modifiedCount === 0){
        throw "Failed to attach comment to post";
    }

  return await getCommentById(newId);
}


const getCommentById = async (id)=>{
    id = validators.validateId(id,"Comment ID");
    const commentsCollection = await db.comments();
    const comment = await commentsCollection.findOne({_id:new ObjectId(id)});
    if(!comment) throw "Comment not found!";
    return comment;
}

const getCommentsByPostId = async (postId)=>{
    postId = validators.validateId(postId,"Post ID");

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
    comment = validators.validateString(content,"Updated comment content");

    const commentsCollection = await db.comments();
    const updated ={content,updatedAt:new Date()};

    const updatedInfo = await commentsCollection.updateOne({_id: new ObjectId(id)},{$set:updated});


    if(updatedInfo.modifiedCount === 0){
        throw `Unable to update comment!`;
    }
    return await getCommentById(id);
}

const commentFunctions={
    createComment,
    getCommentById,
    getCommentsByPostId,
    removeComment,
    updateComment
};

export default commentFunctions;