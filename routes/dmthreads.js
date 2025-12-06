<<<<<<< HEAD
import { Router } from "express";

// Validation
import { validateSchema } from "../middleware/validation.mw.js";
import {
    recipientUsernameSchema,
    messageContentSchema,
} from "../models/dmthreads.js";

// Data layer 
=======
/****************************************************************************
 * TO DO IN THIS FILE: 
 * Add dmEnabled Check (sendoer + recipient)
 * Consider updating the route to be more REST-like
 ****************************************************************************/
import {Router} from "express";
import mongoCollections from "../config/mongoCollections.js";
>>>>>>> 586d91465c0b8de096e0a2b8aa1b804494f5a78e
import {
    createThread,
    createMessage,
    addMessageToThread,
<<<<<<< HEAD
    fetchThreadsForUser
} from "../data/dmthreads.js";

// Users data functions
import * as userData from "../data/users.js";

// Error rendering
import { renderErrorPage } from "../utils/errorUtils.js";

const router = Router();


/****************************************************************************
 * GET /dmthreads
 * Shows all DM threads for the logged-in user. (Inbox)
 ****************************************************************************/
router.get(
    "/", 
    async (req, res) => {
        try {
            const loggedInUser = req.session.user;
            const userId = loggedInUser._id.toString();

            // Fetch all threads where the user participates
            const threads = await fetchThreadsForUser(userId);

            return res.render("dmthreads/index", {
                title: "Your Messages",
                user: loggedInUser,
                threads
            });

        } catch (error) {
            console.error("Error fetching DM threads:", error);
            // TODO: Modal page for these types of errors.
            return renderErrorPage(res, 500, "We couldn't load your messages right now.");
        }
    }
);

/****************************************************************************
 * GET /dmthreads/thread/:id
 * Shows a specific DM thread.
 * NOTE: requireThreadAuthorization middleware:
 *   - validates the thread ID, fetches the thread
 *   - checks user participation, attaches req.thread
 ****************************************************************************/
router.get(
    "/thread/:id",
    async (req, res) => {
        try {
            const loggedInUser = req.session.user;
            const thread = req.thread;  // already loaded by middleware

            return res.render("dmthreads/thread", {
                title: "Conversation",
                thread,
                currentUserId: loggedInUser._id.toString()
            });

        } catch (error) {
            console.error("Error loading DM thread:", error);
            return renderErrorPage(res, 500, "Unable to load this conversation.");
        }
    }
);

/****************************************************************************
 * POST /dmthreads/thread/:id/message
 * Sends a message in an existing DM thread.
 * NOTE: Middleware:
 *   - validates thread ID, loads the thread
 *   - checks participation,enforces rate limit
 ****************************************************************************/
router.post(
    "/thread/:id/message",
    async (req, res) => {
        try {
            const loggedInUser = req.session.user;
            const thread = req.thread;  
            const threadId = thread._id.toString();

            // Validate message content with Yup schema
            await validateSchema([messageContentSchema, "body"], req.body);
            const content = req.body.message.trim();

            // Determine recipient
            const from = loggedInUser._id.toString(); // Note the from here is just keep a record of whos sending, it wont go through front-end.
            const to = thread.participants.find(id => id !== from); // two-person dm system, logic is we know the person logged in, so the other is the recipient.

            if (!to) {
                return renderErrorPage(res, 500, "Unable to determine message recipient.");
            }

            // Build message object
            const newMessage = createMessage(from, to, content);

            // Insert message into thread
            await addMessageToThread(threadId, newMessage);

            // Redirect to thread view
            return res.redirect(`/dmthreads/thread/${threadId}`);

        } catch (error) {
            console.error("Error sending message:", error);
            return renderErrorPage(res, 400, error.message || "Unable to send message."); // Simple fallback.
        }
    }
);

/****************************************************************************
 * POST /dmthreads/create
 * Creates a new DM thread from the logged-in user to a recipient.
 * NOTE:
 *   - Authentication handled globally in app.js
 *   - Thread checks are NOT needed because no thread exists yet
 ****************************************************************************/
router.post(
    "/create",
    async (req, res) => {
        try {
            const loggedInUser = req.session.user;
            const senderId = loggedInUser._id.toString();

            // Validate recipient + message using Yup schemas
            await validateSchema([recipientUsernameSchema, "body"], req.body);
            await validateSchema([messageContentSchema, "body"], req.body);

            const recipientUsername = req.body.recipient.trim().toLowerCase();
            const initialMessageContent = req.body.message.trim();

            // Lookup recipient
            const recipientUser = await userData.getUserByUsername(recipientUsername);

            if (!recipientUser) {
                return renderErrorPage(res, 404, "Recipient user does not exist.");
            }

            const recipientId = recipientUser._id.toString();

            // Prevent self-messaging
            if (recipientId === senderId) {
                return renderErrorPage(res, 400, "You cannot send a DM to yourself.");
            }

            // Check DM permissions
            if (recipientUser.isBanned) {
                return renderErrorPage(res, 403, "This user cannot receive messages.");
            }

            if (recipientUser.settings?.dmsEnabled === false) {
                return renderErrorPage(res, 403, "This user has disabled DMs.");
            }

            // Check if a thread already exists
            const existingThreads = await fetchThreadsForUser(senderId);
            const existingThread = existingThreads.find(t =>
                t.participants.includes(recipientId)
            );

            if (existingThread) {
                return res.redirect(`/dmthreads/thread/${existingThread._id}`);
            }

            // Create thread
            const newThread = await createThread(senderId, recipientId);

            // Build first message
            const initialMessage = createMessage(senderId, recipientId, initialMessageContent);

            // Insert message into thread
            await addMessageToThread(newThread._id.toString(), initialMessage);

            // Redirect to new thread view
            return res.redirect(`/dmthreads/thread/${newThread._id}`);

        } catch (error) {
            console.error("Error creating DM thread:", error);
            return renderErrorPage(res, 500, "Unable to create DM thread.");
        }
    }
);
=======
    fetchThreadById,
    fetchThreadsForUser
} from "../data/dmthreads.js";  

const {dmthreads} = mongoCollections;
const router = Router();
const lastMessageTimestamps = {}; // In Mem Rate Limiter, mapped to username -> timestamp of last message sent.
const {users: usersCollection} = mongoCollections; // Only for accessing Banlist Table.

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
 * NICK TO DO: Check if DMenabled 
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
>>>>>>> 586d91465c0b8de096e0a2b8aa1b804494f5a78e

/****************************************************************************
 * EXPORTS
 ****************************************************************************/
export default router;