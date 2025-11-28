import { Schema } from "yup";

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
 * @return {Array<Promise<Function>>}
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
   const validReqProps = ["body", "params"];

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


   // perform validation for each schema sequentially
   for (const tuple of arrayOfSchemaTuples) {

      const [ schema, requestProperty = "body" ] = tuple;

      if (!validReqProps.includes(requestProperty))
         throw new Error(`Invalid request property for schema validation. Valid: ${validReqProps.join(", ")}`);
      
      return async function(req, res, next) {
   
         // TODO: check for a user session to pass `{ email, username }` to Yup as "context"
   
         try {
   
            // modify request object with neatly shaped data from validation
            req[requestProperty] = await schema.validate(
               { ...req[requestProperty] }, 
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
}

