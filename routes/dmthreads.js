import {Router} from "express";
import mongoCollections from "../config/mongoCollections.js";
import {
    createThread,
    createMessage,
    addMessageToThread,
    fetchThreadById,
    fetchThreadsForUser
} from "../data/dmthreads.js";  

const {dmthreads} = mongoCollections;

const router = Router();

/****************************************************************************
 * GET .../dmthreads/create
 * Show the Create Thread Form
 ****************************************************************************/
router.get("/create", async (req, res) => {
    return res.render("dmthreads/create");
});

/****************************************************************************
 * POST .../dmthreads/create
 * Creates a new thread between two users and redirects to it
 ****************************************************************************/
router.post("/create", async (req, res) => {
    const {user1, user2} = req.body;
    try {
        const newThread = await createThread(user1, user2);
        //console.log("NEW THREAD ID:", newThread._id);
        return res.redirect(`/dmthreads/${newThread._id}`); // redirect to new convo page
    } catch (e) {
        return res.status(500).render("error", {error: e.message});
    }
});

/****************************************************************************
 * GET .../dmthreads/user/username 
 * FEEDBACK: change route to users/username/dmthreads/id
 * Returns Thread Object Array from given username
 ****************************************************************************/
router.get("/user/:username", async (req, res) => {
    const username = req.params.username;

    try {
        const threads = await fetchThreadsForUser(username);
        return res.render("dmthreads/index", {threads});
    } catch (e) {
        return res.status(500).render("error", {error: e.message});
    }
});

/****************************************************************************
 * GET /dmthreads
 * Show all threads (TEMP: until users are implemented)
 ****************************************************************************/
router.get("/", async (req, res) => {
    try {
        // TEMP: fetch ALL threads from DB for now
        const dmCollection = await dmthreads();
        const allThreads = await dmCollection.find({}).toArray();
        allThreads.forEach(t => t._id = t._id.toString());
        res.render("dmthreads/index", {threads: allThreads, title: "Your Direct Message Threads"});
    } catch (e) {
        return res.status(500).json({error: e.message});
    }
});

/****************************************************************************
 * GET .../dmthreads/ThreadId 
 * Returns Unique Thread Document from ThreadId
 ****************************************************************************/
router.get("/:id", async (req, res) => {
    const threadId = req.params.id;
    try {
        const thread = await fetchThreadById(threadId);
        if (!thread) {
            return res.status(404).json({error: "Direct Message Thread not found"});
        }
        return res.render("dmthreads/thread", {thread});
    } catch (e) {
        return res.status(500).json({error: e.message});
    }
});




/****************************************************************************
 * POST .../dmthreads/ThreadId/message 
 * BODY REQUIREMENTS: { From: user1,  To: user2, Content: message contents }
 * Adds a Message Object to the respective ThreadId
 ****************************************************************************/
router.post("/:id/message", async (req, res) => {
    const threadId = req.params.id;
    const {content} = req.body;
    const thread = await fetchThreadById(threadId);

    // TO BE UPDATED: This is just for testing, but will have to take the current user session for FROM.
    const from = "TestUser1";

    const to = thread.participants.find(p => p !== from); // Receiver is the other participant.

    const newMessage = createMessage(from, to, content);

    const updatedThread = await addMessageToThread(threadId, newMessage);
    return res.redirect(`/dmthreads/${threadId}`);
});



export default router;