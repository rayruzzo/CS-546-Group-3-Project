import * as yup from "yup";
import { usernameBaseSchema } from "./users.js";

/****************************************************************************
 * OBJECT ID FORMAT VALIDATION (for threadId)
 * --------------------------------------------------------------------------
 * Used to validate ":id" params before touching the database.
 ****************************************************************************/
export const objectIdSchema = yup
  .string()
  .trim()
  .matches(/^[a-fA-F0-9]{24}$/, "Invalid ObjectId format")
  .required("A valid thread ID is required");


/****************************************************************************
 * SCHEMA: recipientUsernameSchema
 * --------------------------------------------------------------------------
 * validates the "recipient" field when creating a DM thread.
 * I'm borrowing usernameBaseSchema from users.js so username rules remain
 * sync'ed with account creation requirements.
 ****************************************************************************/
export const recipientUsernameSchema = yup.object({
  recipient: usernameBaseSchema
    .required("Recipient username is required")
});

/****************************************************************************
 * SCHEMA: messageContentSchema
 * --------------------------------------------------------------------------
 * Ensures that any message being sent is a non-empty string within limits.
 ****************************************************************************/
export const messageContentSchema = yup.object({
  message: yup
    .string()
    .trim()
    .min(1, "Message cannot be empty")
    .max(2000, "Message exceeds maximum length")
    .required("Message content is required"),
});


/****************************************************************************
 * SCHEMA: threadIdParamSchema
 * --------------------------------------------------------------------------
 * Wraps ObjectId validation inside a Yup object for validateSchema()
 ****************************************************************************/
export const threadIdParamSchema = yup.object({
  id: objectIdSchema,
});

export default {
  recipientUsernameSchema,
  messageContentSchema,
  threadIdParamSchema,
  objectIdSchema,
};
