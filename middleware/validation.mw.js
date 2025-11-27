import { Schema } from "yup";

/**
 * A middleware validation function which allows 
 * different schemas to validate requests on a per-route basis.
 * 
 * @param {Schema} schema          - A Yup schema
 * @param {string} [dataType=body] - The data object we want to validate (supports `body` or `params`)
 */
export function validateSchema(schema, dataType = "body") {

   return async function(req, res, next) {

      // TODO: check for a user session to pass `{ email, username }` to Yup as "context"

      const validDataTypes = ["body", "params"];

      if (!validDataTypes.includes(dataType))
         throw new Error(`'dataType' unsupported for schema validation. Allowed: ${validDataTypes.join(", ")}`);

      try {

         // modify request object with neatly shaped data from validation
         req[dataType] = await schema.validate(
            { ...req[dataType] }, 
            { abortEarly: false }    // `false` shows all errors
         );

         // call next scheduled middleware
         next();

      } catch (e) {

         // send correct error to client
         console.error(e);
         return res.status(400).json(e);
      }
   }
}

