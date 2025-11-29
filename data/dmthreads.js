import {ObjectId} from 'mongodb';
import mongoCollections from '../config/mongoCollections.js';

const dmthreads = mongoCollections.dmthreads;

/**************************************************************************** 
 * function createThread(user1, user2)
 * Description: creates a thread document in the DB between two users.
****************************************************************************/
async function createThread(user1, user2) {

    if (!user1 || !user2) {
        throw new Error('Both user1 and user2 are required to create a thread.');
    };

    const newThread = {
        participants: [user1, user2],
        messages: []
    };

    const dmCollection = await dmthreads();
    const insertInfo = await dmCollection.insertOne(newThread);

    if (!insertInfo.acknowledged || !insertInfo.insertedId) {
        throw new Error('Could not create direct message thread.');
    };
    newThread._id = insertInfo.insertedId.toString();
    return newThread;
};

/**************************************************************************** 
 * function createMessage(from, to, content)
 * Description: returns a message object to be inserted into a thread.
****************************************************************************/
function createMessage(from, to, content) {

    if (!from || !to || !content) {
        throw new Error('from, to, and content are required to create a message.');
    };

    const newMessage = {
        _id: new ObjectId(),
        from,
        to,
        content,
        timestamp: new Date()
    };

    return newMessage;
};

/**************************************************************************** 
 * function addMessageToThread(threadId, message)
 * Description: Adds message object to thread document.
****************************************************************************/
async function addMessageToThread(threadId, message) {
    if (!threadId || !message) {
        throw new Error('threadID and message are required to add message to a dmthread.');
    }

    const dmCollection = await dmthreads();

    const updateInfo = await dmCollection.updateOne(
        { _id: new ObjectId(threadId) },
        { $push: { messages: message } }
    );

    if (updateInfo.modifiedCount === 0) {
        throw new Error("Could not add message to thread.");
    }

    return await fetchThreadById(threadId);
};

/**************************************************************************** 
 * function fetchThreadById(threadId)
 * Description: Looks into the database and returns the respective thread by its id.
****************************************************************************/
async function fetchThreadById(threadId) {

    if (!threadId) {
        throw new Error('thread id is required to fetch a thread.');
    }

    const dmCollection = await dmthreads();
    const objId = new ObjectId(threadId);
    const thread = await dmCollection.findOne({ _id: objId });

    if (!thread) return null;

    thread._id = thread._id.toString();

    return thread;
}

/**************************************************************************** 
 * function fetchThreadsForUser(username)
 * Description: Looks into the database and returns the respective threads for a user.
****************************************************************************/
async function fetchThreadsForUser(username) {

    if (!username) {
        throw new Error('username is required to fetch all threads for user.');
    }

    const dmCollection = await dmthreads();
    const threadsFound = await dmCollection.find({participants: username}).toArray();

    if (threadsFound.length === 0) return [];
    threadsFound.forEach(t => {
        t._id = t._id.toString();
    });

    return threadsFound;
}

/****************************************************************************
 * Exports
 ****************************************************************************/
export {
    createThread,
    createMessage,
    addMessageToThread,
    fetchThreadById,
    fetchThreadsForUser
};











