import yup from "yup";
import { locSchema } from "./locations.js";

const postTypes = {
    OFFER: "offer",
    REQUEST: "request"
}

const postCategories = {
    TRANSPORT: "transport",
    HOUSING: "housing",
    SERVICES: "services",
    GOODS: "goods",
    FOOD: "food",
    PET: "pet care",
    CHILD: "child care",
    ELDER: "elder care",
    EDUCATION: "education",
    EVENT: "event",
    TOOL: "tool",
    REPAIR: "repair",
    LAND: "landcare",
    OTHER: "other"
}

export const titleSchema = yup
  .string()
  .trim()
  .min(5, "Title must be at least 5 characters long")
  .max(100, "Title cannot exceed 100 characters")
  .required("Title is required");

export const contentSchema = yup
  .string()
  .trim()
  .min(10, "Content must be at least 10 characters long")
  .max(5000, "Content cannot exceed 5000 characters")
  .required("Content is required");

export const postTypeSchema = yup
  .string()
  .oneOf(Object.values(postTypes), "Invalid post type")
  .required("Post type is required");

export const postCategorySchema = yup
  .string()
  .oneOf(Object.values(postCategories), "Invalid post category")
  .required("Post category is required");

export const commentsEnabledSchema = yup
  .boolean()
  .required("Comments enabled flag is required");

export const tagsSchema = yup
  .array()
  .of(
    yup
      .string()
      .trim()
      .min(1, "Tag must be at least 1 character long")
      .max(30, "Tag cannot exceed 30 characters")
  )
  .max(20, "Cannot have more than 20 tags");

export const postSchema = yup.object().shape({
    title: titleSchema,
    userId: yup.string().required("User ID is required"), //TODO: further validate userId once Users is merged
    content: contentSchema,
    type: postTypeSchema,
    category: postCategorySchema,
    commentsEnabled: commentsEnabledSchema,
    tags: tagsSchema,
    comments: yup.array().of(yup.string()), // Array of comment IDs
    created_at: yup.date().default(() => new Date()),
    updated_at: yup.date().default(() => new Date()),
    loc: locSchema
});
