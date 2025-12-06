import { threadIdParamSchema } from "../models/dmthreads.js";
import { renderErrorPage } from "../utils/errorUtils.js";
import { fetchThreadById } from "../data/dmthreads.js";

/****************************************************************************
 * LOCAL RATE-LIMIT MEMORY (module scoped, not global to whole app)
 ****************************************************************************/
const lastMessageTimestamps = {};

/****************************************************************************
 * requireThreadAuthorization
 * Ensures the logged-in user is a participant in the thread they are
 * attempting to access. Validates the threadId format BEFORE hitting DB.
 ****************************************************************************/
const requireThreadAuthorization = async (req, res, next) => {
    try {
        // Validate thread ID format directly with Yup
        await threadIdParamSchema.validate(req.params, { abortEarly: false });

        const threadId = req.params.id;
        const userId = req.session.user._id.toString();

        const thread = await fetchThreadById(threadId);

        if (!thread) {
            return renderErrorPage(res, 404, "Conversation not found.");
        }

        if (!thread.participants.includes(userId)) {
            return renderErrorPage(res, 403, "You do not have access to this conversation.");
        }

        req.thread = thread;
        next();
    } catch (err) {
        console.error("Error in requireThreadAuthorization:", err);
        return renderErrorPage(res, 404, "Conversation not found.");
    }
};

/****************************************************************************
 * enforceMessageRateLimit
 * Prevents a user from sending messages too quickly.
 ****************************************************************************/
const enforceMessageRateLimit = (req, res, next) => {
    const userId = req.session.user?._id?.toString();
    if (!userId) return next();

    const now = Date.now();
    const last = lastMessageTimestamps[userId] ?? 0;

    const WINDOW_MS = 5000;

    if (now - last < WINDOW_MS) {
        return renderErrorPage(res, 429, "You're sending messages too quickly.");
    }

    lastMessageTimestamps[userId] = now;
    next();
};

/****************************************************************************
 * requireAuthentication
 * Ensures a user is logged in before using DM routes. I know this is duplicated
 * but just keeping consistency/structure.
 ****************************************************************************/
const requireAuthentication = (req, res, next) => {
    if (!req.session.user) {
        return res.redirect("/login");
    }
    next();
};

/****************************************************************************
 * EXPORT 
 ****************************************************************************/
export default {
    requireThreadAuthorization,
    enforceMessageRateLimit,
    requireAuthentication
};