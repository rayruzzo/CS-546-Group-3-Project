import { Schema } from "yup";
import { renderErrorPage } from "../utils/errorUtils.js";

/**
 * @import { MixedSchema, ArraySchema, DateSchema, NumberSchema, ObjectSchema, StringSchema, TupleSchema } from "yup"
 * @typedef {(MixedSchema|ArraySchema|ObjectSchema|StringSchema|NumberSchema|DateSchema|TupleSchema)} AnySchema
 * @typedef {AnySchema|() => AnySchema} Schema
 */

/**
 * A middleware validation function which allows a variable number
 * of schemas to validate requests sequentially on a per-route basis.
 *
 * @overload
 * @param {...[Schema, (string|undefined)]} schemaTuples - Tuples of `Schema, requestProperty`
 * @return {<Promise<Function>}
 *
 * @overload
 * @param {() => AnySchema} schema        - Any Yup schema
 * @param {string} [requestProperty=body] - The request property to validate (default: "body")
 * @return {Promise<Function>}
 *
 * @overload
 * @param {AnySchema} schema              - Any Yup schema
 * @param {string} [requestProperty=body] - The request property to validate (default: "body")
 * @return {Promise<Function>}
*/
export function validateSchema(...schemaTuples) {

   /** supported request properties to validate */
   const validReqProps = ["body", "params", "query"];

   // ensure that all function signatures are handled by making
   // the input an array of Yup Schema tuples
   let inputArrLen = schemaTuples.length;
   let isArrayOfArrays = true;

   for (let i = 0; i < inputArrLen; i++) {
      if (!Array.isArray(schemaTuples[i])) {

         if (!(schemaTuples[0] instanceof Schema))
            throw new Error("Argument must be `schema, dataType`, or a variable # of `[Schema, dataType]` arrays");

         isArrayOfArrays = false;
         break;
      }

      if (!(schemaTuples[i][0] instanceof Schema))
         throw new Error("The first tuple member is not a Yup Schema type");
      if (inputArrLen === 2 && typeof schemaTuples[i][1] !== "string")
         throw new Error("The second tuple member is not a string");
      if (schemaTuples[i].length > 2)
         throw new Error("2 elements max in each tuple. Ex. `[Schema, dataType]`");
   }

   let arrayOfSchemaTuples = [];
   if (!isArrayOfArrays) {

      if (inputArrLen === 2 && typeof schemaTuples[1] !== "string")
         throw new Error("The second tuple member is not a string");
      if (inputArrLen > 2)
         throw new Error("2 elements max in the touple. Ex. `Schema, dataType`");

      arrayOfSchemaTuples = [schemaTuples];
   } else {
      arrayOfSchemaTuples = schemaTuples;
   }


   return async function(req, res, next) {

      // perform validation for each schema sequentially
      for (const tuple of arrayOfSchemaTuples) {

         const [ schema, requestProperty = "body" ] = tuple;

         if (!validReqProps.includes(requestProperty))
            throw new Error(`Invalid request property for schema validation. Valid: ${validReqProps.join(", ")}`);

         // TODO: test user sessions to pass `{ email, username }` to Yup as "context"

         try {

            // modify request object with neatly shaped data from validation
            req[requestProperty] = await schema.validate(
               { ...req[requestProperty] },
               {
                  abortEarly: false,        // `false` shows all errors
                  context: {
                     session: {             // decides whether some fields are active based on session
                        user: req.session?.user
                     }
                  }
               }
            );

         } catch (e) {

            // send correct error to client
            console.error(e);

            // TODO: get back to this to make sure this is fine
            if (requestProperty === "params")
               return renderErrorPage(res, 400, e.message);
            else
               return res.status(400).json(e);
         }
      }

      // call next scheduled middleware
      next();
   }
}

