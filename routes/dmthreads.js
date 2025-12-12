import { Router } from "express";

// Validation
import { validateSchema } from "../middleware/validation.mw.js";
import { messageContentSchema } from "../models/dmthreads.js";

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

        // Small logic for UI cleanup - if user is unknown (corruptedId from reseed), hide thread from UI.
        // Does not really happen in our production but since it came up during my QA (reseed event), just added for safety.
        const filteredThreads = [];

        for (const thread of threads) {
            // Identify the OTHER user in the conversation
            const otherUserId = thread.participants.find(id => id !== userId);

            if (!otherUserId) {
                // Thread is malformed (should not happen), skip it.
                continue;
            }

            try {
                const otherUser = unwrapUser(await userData.getUserById(otherUserId));

                // If no user found, skip this thread entirely
                if (!otherUser || !otherUser.profile) {
                    console.warn(
                        "Skipping thread (user not found):",
                        thread._id?.toString()
                    );
                    continue;
                }

                // Attach username for rendering
                thread.otherUsername = otherUser.profile.username;

                // Thread is valid, add it
                filteredThreads.push(thread);

            } catch (e) {
                console.warn(
                    "Skipping thread due to unresolved user:",
                    thread._id?.toString(),
                    e?.message
                );
                continue;
            }
        }

        // Render Inbox
        return res.render("dmthreads/inbox", {
            title: "Your Messages",
            user: loggedInUser,
            threads: filteredThreads,
            currentUser: userId
        });

    } catch (error) {
        console.error("Error fetching DM threads:", error);
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
 *
 * NOTES:
 *   - Authentication handled globally in app.js
 *   - Server-side validation is authoritative
 *   - Inline rendering used for clean UX error feedback
 ****************************************************************************/
router.post("/create", async (req, res) => {
  try {
    const loggedInUser = req.session.user;
    const senderId = loggedInUser._id.toString();

    const recipientUsername = (req.body.recipient || "").trim().toLowerCase();
    const initialMessageContent = (req.body.message || "").trim();

    const usernameRegex = /^(?!-)(?!.*--)[A-Za-z0-9-]{4,50}(?<!-)$/;

    // Helper to reduce repetition when rendering validation errors
    const renderCreateError = (errorProps) =>
      res.render("dmthreads/create", {
        title: "Start New Conversation",
        user: loggedInUser,
        previousRecipient: recipientUsername,
        previousMessage: initialMessageContent,
        ...errorProps
      });

    // Username validation

    if (!usernameRegex.test(recipientUsername)) {
      return renderCreateError({
        error:
          "Please enter a valid username (letters, numbers, and hyphens only)."
      });
    }

    // Message validation

    if (!initialMessageContent) {
      return renderCreateError({
        errorMessage: "Your message cannot be empty."
      });
    }

    if (initialMessageContent.length > 2000) {
      return renderCreateError({
        errorMessage: "Your message must be 2000 characters or fewer."
      });
    }

    // Recipient lookup

    let recipientUser;
    try {
      recipientUser = unwrapUser(
        await userData.getUserByUsername(recipientUsername)
      );
    } catch {
      recipientUser = null;
    }

    if (!recipientUser) {
      return renderCreateError({
        error: "We couldn't find anyone with that username."
      });
    }

    const recipientId = recipientUser._id.toString();

    // Permission guards

    if (recipientId === senderId) {
      return renderCreateError({
        error: "You can’t send a message to yourself."
      });
    }

    if (recipientUser.isBanned) {
      return renderCreateError({
        error: "This user cannot receive messages at the moment."
      });
    }

    if (recipientUser.settings?.dmsEnabled === false) {
      return renderCreateError({
        error: "This user is not accepting messages right now."
      });
    }

    // Existing thread reuse redirect

    const existingThreads = await fetchThreadsForUser(senderId);
    const existingThread = existingThreads.find((t) =>
      t.participants.includes(recipientId)
    );

    if (existingThread) {
      return res.redirect(`/dmthreads/thread/${existingThread._id}`);
    }

    // Thread creation

    const newThread = await createThread(senderId, recipientId);

    const initialMessage = createMessage(
      senderId,
      recipientId,
      initialMessageContent
    );

    await addMessageToThread(newThread._id.toString(), initialMessage);

    return res.redirect(`/dmthreads/thread/${newThread._id}`);

  } catch (error) {
    console.error("Error creating DM thread:", error);
    return renderErrorPage(res, 500, "Unable to create DM thread.");
  }
});


/****************************************************************************
 * GET /dmthreads/check-user
 * Async validation endpoint used by the DM creation form.
 * Powers live username validation UX (green check / inline errors)
 * NOTE:
 * This is just a security boundary — server-side validation still enforced
 *
 * RETURNS:
 *   {
 *     exists:      boolean,
 *     validFormat: boolean,
 *     banned:      boolean,
 *     dmsEnabled:  boolean,
 *     self:        boolean
 *   }
 ****************************************************************************/
router.get("/check-user", async (req, res) => {
  try {
    const loggedInUser = req.session.user;
    const senderId = loggedInUser._id.toString();

    const username = (req.query.u || "").trim().toLowerCase();
    const usernameRegex = /^(?!-)(?!.*--)[A-Za-z0-9-]{4,50}(?<!-)$/;

    // Form validation

    if (!usernameRegex.test(username)) {
      return res.json({
        exists: false,
        validFormat: false
      });
    }

    // User lookup

    let user;
    try {
      user = unwrapUser(await userData.getUserByUsername(username));
    } catch {
      user = null;
    }

    if (!user) {
      return res.json({
        exists: false,
        validFormat: true
      });
    }

    const userId = user._id.toString();

    // Return UX flags

    return res.json({
      exists: true,
      validFormat: true,
      banned: Boolean(user.isBanned),
      dmsEnabled: user.settings?.dmsEnabled !== false,
      self: userId === senderId
    });

  } catch (error) {
    console.error("Async username check failed:", error);
    return res.json({
      exists: false,
      validFormat: false
    });
  }
});

/****************************************************************************
 * EXPORTS
 ****************************************************************************/
export default router;
