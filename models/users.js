import { ObjectId } from "mongodb";
import yup, { ObjectSchema } from "yup";
import { loadYupCustomMethods } from "../utils/yupUtils.js";
import userData from "../data/users.js";
import db from "../config/mongoCollections.js";

const { users } = db;

/** load custom Yup methods */
loadYupCustomMethods()

// +++++++++++++++++++++++++++ //
// User Schema Building Blocks //
// +++++++++++++++++++++++++++ //

export const objectIdSchema = yup
   .mixed((_id) => ObjectId.isValid(_id))
   .transform(function (value, originalValue) {
      return originalValue.trim() || undefined;
   })
   .typeError(({ label }) => `${label} id is not a valid id`)
   .required();


export const emailSchema = yup
   .string()
   // handle string transforms directly in `transform()` to catch dev TypeError's
   .transform(function (value, originalValue) {
      return this.isType(originalValue) ? originalValue.trim().toLowerCase() : originalValue;
   })
   .requiredIfNotLoggedIn("Email")
   // `sequence()` custom yup method - avoid trips to the server for data obviously invalid
   .sequence([
      () => yup.string()
               .typeError(({ label, type }) => `${label} must be a ${type}`)
               .email()
               .label("Email"),

      () => yup.string().uniqueEmail(null, users),
   ]);


export const passwordSchema = yup
   .string()
   // below, like above is only used to validate for dev (HTML inputs always return strings)
   .transform(function (value, originalValue) {
      return this.isType(originalValue) ? originalValue.trim() : originalValue;
   })
   // `typeError()` is for dev (HTML inputs are already strings)
   .typeError(({ label, type }) => `${label} must be a ${type}`)
   .min(10)
   // regex good enough for this project but def not for prod
   // https://stackoverflow.com/questions/48345922/reference-password-validation
   .matches(
      /^(?=\P{Ll}*\p{Ll})(?=\P{Lu}*\p{Lu})(?=\P{N}*\p{N})(?=[\p{L}\p{N}]*[^\p{L}\p{N}])[\s\S]{10,}$/gmu,
      ({ path }) => `${path} must have at least one lowercase letter, uppercase letter, one number, and one special character`
   )
   .requiredIfNotLoggedIn()
   .label("Password");


export const usernameBaseSchema = yup
   .string()
   .min(4)
   .max(50)
   .matches(
      /^(?!-)(?!.*--)(?=.{4,50}$)(?!.*-$)[a-zA-Z0-9\-]+?$/gm,
      ({label}) => `${label} must be 4 to 50 basic latin characters composed of letters, numbers, or non-consecutive dashes, but no dashes at the beginning or end`
   )
   .label("Username");


export const usernameSchema = yup
   .string()
   .requiredIfNotLoggedIn("Username")
   .sequence([
      () => usernameBaseSchema,
      () => yup.string().lowercase().trim(),
      () => yup.string().uniqueUsername(null, users),
   ]);


// TODO: require admin privileges to change role
export const roleSchema = yup
   .string()
   .lowercase()
   .trim()
   .oneOf(Object.values(userData.server.roles))
   .default(userData.server.roles.USER)
   .label("Role")
   .required();


export const nameSchemaBase = yup
   .string()
   .min(2)
   .nullable()             // NOTE: default key in MongoDB should be `null`
   .default(null)
   .trim();


export const avatarSchema = yup
   .object({
      resized:       yup.string().transform((val) => val ? val : null).nullable().default(null).trim(),
      resizedSquare: yup.string().transform((val) => val ? val : null).nullable().default(null).trim()
   })
   .exact(({ label, properties }) => `${label} has invalid properties: ${properties}`)
   .nullable()
   .default(null)
   .label("Avatar");


export const profileSchema = yup.object({
   username:
      usernameSchema,      // REQUIRED

   firstName:              // OPTIONAL
      nameSchemaBase.label("First Name"),

   lastName:               // OPTIONAL
      nameSchemaBase.label("Last Name"),

   dob:                    // REQUIRED
      yup.date()
         .typeError(({ label, type }) => `${label} must be a ${type}`)
         .min(new Date().getFullYear() - 150, "Impossible. You are not this old")
         .max(new Date().getFullYear() - 18,  "You must be 18 years or older")
         .requiredIfNotLoggedIn("Date of Birth")
         .label("Date of Birth"),

   bio:                    // OPTIONAL
      yup.string()
         .max(250)
         .nullable()
         .default(null)
         .trim()
         .label("Bio"),

   avatar:                 // OPTIONAL
      avatarSchema

})
.label("User Profile")
.exact(({ label, properties }) => `${label} has invalid properties: ${properties}`)
.requiredIfNotLoggedIn("User Profile");


export const settingsSchema = yup.object({
   dmsEnabled:
      yup.boolean()
         .typeError(({ label, type }) => `${label} must be either 'true' or 'false'`)
         .default(true)
         .label("Enable Direct Messages")

   // ...more settings
})
.label("Settings")
.exact(({ label, properties }) => `${label} has invalid properties: ${properties}`)
.requiredIfNotLoggedIn("Settings");


// ========================== //
// User Route-Specific Schema //
// ========================== //

/**
 * Validates an `ObjectId` on the surface to not make unnecessary requests to MongoDB.
 *
 * @param {string} label - the label to inject in the `${label} id is not a valid id` error message
 * @returns {ObjectSchema} a Yup schema for use with, ex. `req.params`
 */
export const getResourceByIdSchema = (label) => yup.object({
   id: objectIdSchema.label(label || "id")
});

/**
 * Validates a `username` URL param on the surface to not make unnecessary requests to MongoDB.
 *
 * @returns {ObjectSchema} a Yup schema for use with, ex. `req.params`
 */
export const usernameParamSchema = yup.object()
   .test("usernameShape",
      ({value}) => `User with username ${value?.username || null} is invalid`,
      async (value) => usernameBaseSchema.isValid(value?.username)
   );

/**
 * Fully validates a `username` request body.
 *
 * @returns {ObjectSchema} a Yup schema for use with, ex. `req.params`
 */
export const usernameBodySchema = yup.object({
   username: usernameSchema
});

/**
 * Fully validates an `email` request body.
 *
 * @returns {ObjectSchema} a Yup schema for use with, ex. `req.params`
 */
export const emailBodySchema = yup.object({
   email: emailSchema
});

/**
 * Fully validates a `dob` (date of birth) request body.
 *
 * @returns {ObjectSchema} a Yup schema for use with, ex. `req.params`
 */
export const dobBodySchema = yup.object({
   dob: dobSchema
});

/**
 * Fully validates a `dob` (date of birth) request body.
 *
 * @returns {ObjectSchema} a Yup schema for use with, ex. `req.params`
 */
export const zipcodeBodySchema = yup.object({
   zipcode: zipcodeSchema
});



// ***************** //
// User Main Schemas //
// ***************** //

export const userSchema = yup.object({
   email:
      emailSchema,

   password:          // NOTE: password will be hashed in `createUser()`, not here
      passwordSchema,

   role:
      roleSchema,

   zipcode:            // TODO: finish zipcode validation
      yup.string()
         .requiredIfNotLoggedIn("ZIP Code")
         .trim()
         .length(5)
         .matches(
            /^[0-9]{5}$/gm,
            ({ label }) => `${label} must be 5 digits long`)
         // TODO: <----- LOOKUP ZIPCODE HERE
         .label("ZIP Code"),

   profile:
      profileSchema,

   settings:
      settingsSchema,
})
.label("User")
.exact(({ label, properties }) => `${label} has invalid properties: ${properties}`)
.requiredIfNotLoggedIn("User");
