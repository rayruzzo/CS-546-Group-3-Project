/****************************************************************************
 * models/moderator.js
 * --------------------------------------------------------------------------
 * Validation schemas for moderator routes.
 ****************************************************************************/

import yup from "yup";

export const postIdParamSchema = yup.object({
  id: yup
    .string()
    .trim()
    .matches(/^[a-fA-F0-9]{24}$/, "Invalid ObjectId format")
    .required("A valid post ID is required")
});
