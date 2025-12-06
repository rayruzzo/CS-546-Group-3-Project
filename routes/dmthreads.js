import { Router } from "express";

// Validation
import { validateSchema } from "../middleware/validation.mw.js";
import {
    recipientUsernameSchema,
    messageContentSchema,
} from "../models/dmthreads.js";

// Data layer 
import {
    createThread,
    createMessage,
    addMessageToThread,
    fetchThreadsForUser
} from "../data/dmthreads.js";

// Users data functions
import userData from "../data/users.js"; // Note: getUserByUsername returns { user, success } 
import { unwrapUser } from "../utils/userUtils.js"; // Destructure util just to get the wiring working correctly

// Error rendering
import { renderErrorPage } from "../utils/errorUtils.js";

const router = Router();


/****************************************************************************
 * GET /dmthreads
 * Shows all DM threads for the logged-in user. (Inbox)
 ****************************************************************************/
router.get("/", async (req, res) => {
    try {
        const loggedInUser = req.session.user;
        const userId = loggedInUser._id.toString();

        // Fetch all threads where the user participates
        const threads = await fetchThreadsForUser(userId);

        // Attach other participant's username to each thread for the inbox view
        for (const thread of threads) {
            const otherUserId = thread.participants.find(id => id !== userId);

            if (!otherUserId) {
                thread.otherUsername = "Unknown User";
                continue;
            }

            try {
                const otherUser = unwrapUser(await userData.getUserById(otherUserId));

                if (!otherUser || !otherUser.profile) {
                    thread.otherUsername = "Unknown User";
                    continue;
                }

                thread.otherUsername = otherUser.profile.username;
            } catch (e) {
                console.warn("Could not resolve user in inbox for thread", thread._id?.toString(), e?.message);
                thread.otherUsername = "Unknown User";
            }
        }

        return res.render("dmthreads/inbox", {
            title: "Your Messages",
            user: loggedInUser,
            threads,
            currentUser: userId
        });

    } catch (error) {
        console.error("Error fetching DM threads:", error);
        //TODO: Modal.
        return renderErrorPage(res, 500, "We couldn't load your messages right now.");
    }
});

/****************************************************************************
 * GET /dmthreads/thread/:id
 * Shows a specific DM thread.
 * NOTE: requireThreadAuthorization middleware:
 *   - validates the thread ID, fetches the thread
 *   - checks user participation, attaches req.thread
 ****************************************************************************/
router.get("/thread/:id", async (req, res) => {
    try {
        const loggedInUser = req.session.user;
        const thread = req.thread; // set by dmthreads middleware

        const currentUserId = loggedInUser._id.toString();
        const otherUserId = thread.participants.find(id => id !== currentUserId);

        if (!otherUserId) {
            return renderErrorPage(res, 400, "Invalid thread participants.");
        }

        let chatPartner = "Unknown User";

        try {
            const otherUser = unwrapUser(await userData.getUserById(otherUserId));

            if (otherUser && otherUser.profile && otherUser.profile.username) {
                chatPartner = otherUser.profile.username;
            }
        } catch (e) {
            console.warn("Could not resolve chat partner for thread", thread._id?.toString(), e?.message);
        }

        return res.render("dmthreads/thread", {
            title: "Conversation",
            user: loggedInUser,
            thread,
            currentUserId,
            chatPartner
        });

    } catch (error) {
        console.error("Error loading DM thread:", error);
        return renderErrorPage(res, 500, "Unable to load this conversation.");
    }
});

/****************************************************************************
 * GET /dmthreads/create
 * Renders the Start New Conversation form
 ****************************************************************************/
router.get("/create", async (req, res) => {
    try {
        const loggedInUser = req.session.user;

        return res.render("dmthreads/create", {
            title: "Start New Conversation",
            user: loggedInUser
        });

    } catch (error) {
        console.error("Error loading create page:", error);
        return renderErrorPage(res, 500, "Unable to load new conversation page.");
    }
});

/****************************************************************************
 * POST /dmthreads/thread/:id/message
 * Sends a message in an existing DM thread.
 * NOTE: Middleware:
 *   - validates thread ID, loads the thread
 *   - checks participation,enforces rate limit
 *   - validates message body with Yup
 ****************************************************************************/
router.post(
    "/thread/:id/message",
    validateSchema([messageContentSchema, "body"]),
    async (req, res) => {
        try {
            const loggedInUser = req.session.user;
            const thread = req.thread;
            const threadId = thread._id.toString();

            const content = req.body.message.trim();

            const from = loggedInUser._id.toString();
            const to = thread.participants.find(id => id !== from);

            if (!to) {
                return renderErrorPage(res, 500, "Unable to determine message recipient.");
            }

            const newMessage = createMessage(from, to, content);
            await addMessageToThread(threadId, newMessage);

            return res.redirect(`/dmthreads/thread/${threadId}`);

        } catch (error) {
            console.error("Error sending message:", error);
            return renderErrorPage(res, 400, error.message || "Unable to send message.");
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
    validateSchema(
        [recipientUsernameSchema, "body"],
        [messageContentSchema, "body"]
    ),                                              
    async (req, res) => {
        try {
            const loggedInUser = req.session.user;
            const senderId = loggedInUser._id.toString();

            // Body is already validated by validateSchema
            const recipientUsername = req.body.recipient.trim().toLowerCase();
            const initialMessageContent = req.body.message.trim();

            // Lookup recipient
            const recipientUser = unwrapUser(await userData.getUserByUsername(recipientUsername));

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
            const existingThread = existingThreads.find((t) =>
                t.participants.includes(recipientId)
            );

            if (existingThread) {
                return res.redirect(`/dmthreads/thread/${existingThread._id}`);
            }

            // Create thread
            const newThread = await createThread(senderId, recipientId);

            // Build first message
            const initialMessage = createMessage(
                senderId,
                recipientId,
                initialMessageContent
            );

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

/****************************************************************************
 * EXPORTS
 ****************************************************************************/
export default router;