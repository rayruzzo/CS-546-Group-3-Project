/****************************************************************************
 * TO DO IN THIS FILE: 
 * Add dmEnabled Check (sendoer + recipient)
 * Consider updating the route to be more REST-like
 ****************************************************************************/
import {Router} from "express";
import mongoCollections from "../config/mongoCollections.js";
import {
    createThread,
    createMessage,
    addMessageToThread,
    fetchThreadById,
    fetchThreadsForUser
} from "../data/dmthreads.js";  
import {users as usersCollection} from "../config/mongoCollections.js"; // Only for accessing Banlist Table.

const {dmthreads} = mongoCollections;
const router = Router();
const lastMessageTimestamps = {}; // In Mem Rate Limiter, mapped to username -> timestamp of last message sent.

/****************************************************************************
 * Function getUserByUsername(username)
 * Helper Function to access Ban Status
 ****************************************************************************/
async function getUserByUsername(username) {
    const users = await usersCollection();
    return await users.findOne({ "profile.username": username.toLowerCase() });
}

/****************************************************************************
 * GET .../dmthreads/create
 * Show the Create Thread Form
 ****************************************************************************/
router.get("/create", async (req, res) => {
    if (req.session.user.isBanned) {
        return res.status(403).render("error", {
            error: "You cannot use DMs while banned."
        });
    }
    return res.render("dmthreads/create");
});

/****************************************************************************
 * POST .../dmthreads/create
 * The logged in user fills in which user they want to meesage.
 * NICK TO DO: Check if DMenabled for user2, check if user banned both ways.
 ****************************************************************************/
router.post("/create", async (req, res) => {

    // User 1: Logged in, User 2: Chosen from Form.
    const user1 = req.session.user.username;  
    const user2 = req.body.user2; 

    // Obligatory self-check.
    if (user1 === user2) {
        return res.status(400).render("dmthreads/create", {
            error: "You cannot create a chat with yourself."
        });
    } 

    // Ban Check
    const user1Data = await getUserByUsername(user1);
    const user2Data = await getUserByUsername(user2);

    if (!user2Data) {
        return res.status(404).render("dmthreads/create", {
            error: "That user does not exist."
        });
    }
    
    if (user1Data.isBanned) {
        return res.status(403).render("error", {
            error: "You cannot create new conversations while banned."
        });
    }

    if (user2Data.isBanned) {
        return res.status(403).render("dmthreads/create", {
            error: "You cannot start a conversation with a banned user."
        });
    }

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
 * Shows all DM threads for the logged-in user.
 ****************************************************************************/
router.get("/user/:username", async (req, res) => {
    const username = req.session.user.username; 
    try {
        const threads = await fetchThreadsForUser(username);
        return res.render("dmthreads/index", {threads});
    } catch (e) {
        return res.status(500).render("error", {error: e.message});
    }
});

/****************************************************************************
 * GET /dmthreads
 * TEMP ROUTE: For debugging only. 
 * Will be removed before final submission.
 ****************************************************************************/
router.get("/", async (req, res) => {
    if (!req.session.user) {
        return res.status(401).render("error", {error: "You must be logged in."});
    }
    try {
        const dmCollection = await dmthreads();
        const allThreads = await dmCollection.find({}).toArray();
        allThreads.forEach(t => t._id = t._id.toString());
        res.render("dmthreads/index", {
            threads: allThreads, 
            title: "Developer Debug View — All DM Threads"
        });
    } catch (e) {
        return res.status(500).json({error: e.message});
    }
});

/****************************************************************************
 * GET .../dmthreads/ThreadId 
 * Shows a specific DM thread.
 * Only participants can view it.
 ****************************************************************************/
router.get("/:id", async (req, res) => {

    // Login/Authentication Check
    if (!req.session.user) {
        return res.status(401).render("error", {
            error: "You must be logged in to view messages."
        });
    }

    const threadId = req.params.id;
    const currentUser = req.session.user.username;

    try {
        const thread = await fetchThreadById(threadId);

        // Thread Check
        if (!thread) {
            return res.status(404).render("error", {
                error: "Direct Message Thread was not found."
            });
        }

        // Participant/Authorization Check
        if (!thread.participants.includes(currentUser)) {
            return res.status(403).render("error", {
                error: "You are not a part of this conversation, access denied."
            });
        }

        // Really far-off edge case but protects against DB manipulation/corruption
        if (!thread.participants || thread.participants.length !== 2) {
        return res.status(500).render("error", {
            error: "This conversation is invalid."
        });
    }

        // Pass username to template for css styling
        return res.render("dmthreads/thread", {
            thread,
            currentUser
        });

    } catch (e) {
        return res.status(500).render("error", {error: e.message});
    }

});

/****************************************************************************
 * POST .../dmthreads/ThreadId/message 
 * Sends a message inside a DM thread.
 * Logic is that you must be logged in and you must be a participant.
 ****************************************************************************/
router.post("/:id/message", async (req, res) => {
    const threadId = req.params.id;
    const {content} = req.body;
    const MAX_MESSAGE_CHAR_LIMIT = 1000;    // Hard-cap on message character limit.
    const RATE_LIMITER_MILLISECONDS = 2000; // Message-Send Cooldown.

    // Login/Authentication Check
    if (!req.session.user) {
        return res.status(401).render("error", {
            error: "You must be logged in to send messages."
        });
    }

    const from = req.session.user.username;

    // Logged-in user ban check
    if (req.session.user.isBanned) {
        return res.status(403).render("error", {
            error: "You cannot send messages while banned."
        });
    }

    try {
        const thread = await fetchThreadById(threadId);
        
        // Thread Check
        if (!thread) {
            return res.status(404).render("error", {
                error: "Conversation not found."
            });
        }

        // Really far off edge-case but checks if mechanics are in place/DB not corrupted.
        if (!thread.participants || thread.participants.length !== 2) {
            return res.status(500).render("error", {
                error: "This conversation is invalid."
            });
        }

        // Participant/Authorization Check
        if (!thread.participants.includes(from)) {
            return res.status(403).render("error", {
                error: "You cannot send messages in a chat you are not a part of."
            });
        }

        // Validate Message Body 

        const trimmed = content.trim();

        if (trimmed.length === 0) {
            return res.status(400).render("dmthreads/thread", {
                thread,
                currentUser: from,
                error: "Message cannot be empty."
            });
        }

        if (trimmed.length > MAX_MESSAGE_CHAR_LIMIT) {   
            return res.status(400).render("dmthreads/thread", {
                thread,
                currentUser: from,
                error: `Message is too long (max ${MAX_MESSAGE_CHAR_LIMIT} characters).`
            });
        }

        // Rate Limiter
        const now = Date.now();
        const last = lastMessageTimestamps[from];

        if (last && (now - last < RATE_LIMITER_MILLISECONDS)) {
            return res.status(429).render("dmthreads/thread", {
                thread,
                currentUser: from,
                error: "You're sending messages too quickly."
            });
        }

        lastMessageTimestamps[from] = now;

        // Recipient check
        const to = thread.participants.find(p => p !== from);

        // Obligatory Fail Safe for the above line:
        if (!to) {
            return res.status(500).render("error", {
                error: "Could not determine recipient for this message."
            });
        }

        // Fetch recipient data
        const toUser = await getUserByUsername(to);

        // If recipient banned → cannot send
        if (toUser?.isBanned) {
            return res.status(403).render("dmthreads/thread", {
                thread,
                currentUser: from,
                error: "You cannot send messages to a banned user."
            });
        }

        // Message Construction
        const newMessage = createMessage(from, to, trimmed);
        await addMessageToThread(threadId, newMessage);

        // Redirection to thread view
        return res.redirect(`/dmthreads/${threadId}`); 


    } catch (e) {
        return res.status(500).render("error", {error: e.message});
    }
});

/****************************************************************************
 * EXPORTS
 ****************************************************************************/
export default router;