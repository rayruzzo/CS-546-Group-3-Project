import {ObjectId} from 'mongodb';
import mongoCollections from '../config/mongoCollections.js';

const dmthreads = mongoCollections.dmthreads;

/****************************************************************************
 * function ensureValidId(id, fieldName = "id")
 * Description: Helper to ensure id is valid.
****************************************************************************/
function ensureValidId(id, fieldName = "id") {
    if (!id) throw new Error(`${fieldName} is required.`);
    try {
        return new ObjectId(id);
    } catch {
        throw new Error(`${fieldName} is not a valid ObjectId.`);
    }
}

/****************************************************************************
 * function createThread(user1, user2)
 * Description: creates a thread document in the DB between two users.
****************************************************************************/
async function createThread(user1Id, user2Id) {
    if (!user1Id || !user2Id) {
        throw new Error("Both user1Id and user2Id are required to create a thread.");
    }

    const newThread = {
        initiator: user1Id,
        participants: [user1Id, user2Id],
        messages: [],
        created_at: new Date(),
        updated_at: new Date(),
        lastMessageAt: {} // this is just to keep per-user rate limiting. Opted for in thread vs global.
    };

    const collection = await dmthreads();
    const insertInfo = await collection.insertOne(newThread);

    if (!insertInfo.acknowledged) {
        throw new Error("Could not create DM thread.");
    }

    return {
        ...newThread,
        _id: insertInfo.insertedId.toString()
    };
}

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
        throw new Error("threadId and message are required to add a message.");
    }

    const collection = await dmthreads();
    const threadObjId = ensureValidId(threadId, "threadId");

    const updateInfo = await collection.updateOne(
        { _id: threadObjId },
        {
            $push: { messages: message },
            $set: {
                 // Updates rate limit tracker *inside the thread* (no global memory)
                [`lastMessageAt.${message.from}`]: Date.now()
            }
        }
    );

    if (updateInfo.modifiedCount === 0) {
        throw new Error("Could not add message to thread — thread may not exist.");
    }

    return await fetchThreadById(threadId);
}

/****************************************************************************
 * function fetchThreadById(threadId)
 * Description: Looks into the database and returns the respective thread by its id.
****************************************************************************/
async function fetchThreadById(threadId) {
    const threadObjId = ensureValidId(threadId, "threadId");
    const collection = await dmthreads();

    const thread = await collection.findOne({ _id: threadObjId });
    if (!thread) return null;

    // Convert thread._id to string
    thread._id = thread._id.toString();

    // Convert message._id to string for handlebars
    if (Array.isArray(thread.messages)) {
        thread.messages = thread.messages.map(msg => ({
            ...msg,
            _id: msg._id.toString()
        }));
    }

    return thread;
}

/****************************************************************************
 * function fetchThreadsForUser(userId)
 * Returns all threads where the given userId is a participant.
****************************************************************************/
async function fetchThreadsForUser(userId) {
    if (!userId) throw new Error("userId is required to load threads for a user.");

    const collection = await dmthreads();
    const threads = await collection
        .find({ participants: userId }) // participants stored as strings
        .toArray();

    return threads.map(t => ({
        ...t,
        _id: t._id.toString()
    }));
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











