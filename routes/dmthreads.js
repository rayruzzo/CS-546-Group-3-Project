import {Router} from "express";
import {
    fetchThreadById, fetchThreadsForUser, createMessage, addMessageToThread, dmThreads
} from "../data/messages.js";

const router = Router();

/****************************************************************************
 * GET .../dmthreads/ThreadId 
 * Returns Unique Thread Object from Threadid
 ****************************************************************************/
router.get("/:id", (req, res) => {
    const threadId = req.params.id;
    const thread = fetchThreadById(dmThreads, threadId);

    if (!thread) {
        return res.status(404).json({error: "Direct Message Thread not found"});
    }

    return res.json(thread);
});

/****************************************************************************
 * GET .../dmthreads/user/username 
 * Returns Thread Object Array from given username
 ****************************************************************************/
router.get("/user/:username", (req, res) => {
    const username = req.params.username;
    const threads = fetchThreadsForUser(dmThreads, username);

    if (threads.length === 0) {
        return res.status(404).json({error: "No DM threads found for this user"});
    }

    return res.json(threads);
});

/****************************************************************************
 * POST .../dmthreads/ThreadId/message 
 * BODY REQUIREMENTS: { From: user1,  To: user2, Content: message contents }
 * Adds a Message Object to the respective ThreadId
 ****************************************************************************/
router.post("/:id/message", (req, res) => {
    const threadId = req.params.id;
    const {from, to, content} = req.body;
    const thread = fetchThreadById(dmThreads, threadId);

    if (!thread) {
        return res.status(404).json({error: "Direct Message Thread not found"});
    }


    if (!from || !to || !content) {
        return res.status(400).json({error: "from, to, and content are required for posting a message"});
    }

    const newMessage = createMessage(from, to, content);
    addMessageToThread(thread, newMessage);
    
    return res.json(thread);
});






export default router;