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

/****************************************************************************
 * EXPORTS
 ****************************************************************************/
export default router;