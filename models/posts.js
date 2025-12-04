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

const priorityValues = {
    LOW: 1,
    NORMAL: 2,
    HIGH: 3,
    URGENT: 4
}

const titleSchema = yup
  .string()
  .trim()
  .min(5, "Title must be at least 5 characters long")
  .max(100, "Title cannot exceed 100 characters")
  .required("Title is required");

const contentSchema = yup
  .string()
  .trim()
  .min(10, "Content must be at least 10 characters long")
  .max(5000, "Content cannot exceed 5000 characters")
  .required("Content is required");

const postTypeSchema = yup
  .string()
  .trim()
  .oneOf(Object.values(postTypes), "Invalid post type")
  .required("Post type is required");

const postCategorySchema = yup
  .string()
  .trim()
  .oneOf(Object.values(postCategories), "Invalid post category")
  .required("Post category is required");

const commentsEnabledSchema = yup
  .boolean().default(true)
  .required("Comments enabled flag is required");

const tagsSchema = yup
  .array()
  .of(
    yup
      .string()
      .trim()
      .min(1, "Tag must be at least 1 character long")
      .max(30, "Tag cannot exceed 30 characters")
  )
  .max(20, "Cannot have more than 20 tags");

const prioritySchema = yup
  .number()
  .oneOf(Object.values(priorityValues), "Invalid priority level")
  .default(priorityValues.NORMAL);

const expiresAtSchema = yup
  .date()
  .min(new Date(), "Expiration date cannot be in the past")
  .nullable()
  .default(null);

const postSchema = yup.object().shape({
    title: titleSchema,
    userId: yup.string().required("User ID is required"),
    content: contentSchema,
    type: postTypeSchema,
    category: postCategorySchema,
    commentsEnabled: commentsEnabledSchema,
    tags: tagsSchema,
    comments: yup.array().of(yup.string()), // Array of comment IDs
    createdAt: yup.date().default(() => new Date()),
    updatedAt: yup.date().default(() => new Date()),
    priority: prioritySchema,
    expiresAt: expiresAtSchema,
    zipcode: yup.string().required("Zipcode is required"),
    loc: locSchema
});

export default {
    postTypes,
    postCategories,
    priorityValues,
    postSchema,
    titleSchema,
    contentSchema,
    postTypeSchema,
    postCategorySchema,
    commentsEnabledSchema,
    tagsSchema,
    prioritySchema,
    expiresAtSchema
};