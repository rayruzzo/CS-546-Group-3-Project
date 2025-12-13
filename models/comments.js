import yup from "yup";
import { loadYupCustomMethods } from "../utils/yupUtils.js";
import { objectIdSchema } from "./users.js";


export const commentContentSchema = yup
  .string()
  .trim()
  .min(1, "Comment content must be at least 1 character long")
  .max(1000, "Comment content cannot exceed 1000 characters")
  .required("Comment content is required");

export const commentSchema = yup.object().shape({
    postId: objectIdSchema,
    userId: objectIdSchema,
    content: commentContentSchema,
    createdAt: yup.date().default(() => new Date()),
    updatedAt: yup.date().default(() => new Date())
});

