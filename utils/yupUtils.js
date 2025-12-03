import { Collection } from "mongodb";
import yup, { Schema } from "yup";

/**
 * Loads custom methods for Yup validation chains
 */
export function loadYupCustomMethods() {

   /**
    * Adds a sequential method to Yup that validates in order.
    * Used to avoid unnecessary requests to server if value is obviously invalid.
    * Slightly modified from: https://github.com/jquense/yup/issues/851#issuecomment-1049705180
    */
   yup.addMethod(yup.string, "sequence", function sequence(testFunctionArray) {
      return this.test(async (value, testContext) => {

         // get the `context` passed into the original top-level `validate()`
         // NOTE: used for executing differently depending on if there is a user session or not
         const validationContext = testContext?.options?.context;

         // also pass down whether optional or required from parent
         const optional = testContext?.schema?.spec?.optional;

         try {

            let arrayLen = testFunctionArray.length;
            for (let i = 0; i < arrayLen; i++) {
               await testFunctionArray[i]().validate(value, 
                  { context: { ...validationContext, optional: optional } }
                  // ^ we also have to pass `context` ^ to all the sequenced validators
               );
            }                      

         } catch ({ message }) {
            return testContext.createError({ message });
         }

         // advance if all sequential tests are true
         return true;
      });
   });


   /**
    * Adds a method to ALL Yup schema types that makes a schema required only if you are NOT logged in
    */
   yup.addMethod(Schema, "requiredIfNotLoggedIn", function requiredIfNotLoggedIn(label, message) {
      
      // "$session" - a special variable passed in from `<schema>.validate(val, {context: session })`
      return  this.label(label || "This")
                  .when("$session", {      
                     is: (session) => session.user,
                     then: (schema) => schema,
                     otherwise: (schema) => {
                        return schema.required(({label}) => message || `${label} is a required field`)
                     }
                  });
   })


   /**
    * Adds a method to Yup that Hits up MongoDB and checks if the `email` is unique
    */
   yup.addMethod(yup.string, "uniqueEmail", function uniqueEmail(message, userCollection) {

      return this.label("Email").test(
         "uniqueEmail", 
         message, 
         async function (value, testContext) {

            if (!userCollection)
               throw new Error("Please provide a MongoDB Collection");
            if (!(typeof userCollection !== Collection))
               throw new Error(
                  "userCollection is not a MongoDB Collection", 
                  {cause: userCollection}
               );


            // get the `context` passed into the original top-level `validate()`
            // NOTE: used for executing differently depending on if there is a user session or not
            const validationContext = testContext?.options?.context;

            // check whether this is required or has been set optional by `requiredIfNotLoggedIn()`
            const optional = validationContext?.optional;
            
            // grab session context if exists
            const sessionEmail = validationContext?.session?.user?.email?.toLowerCase();

            // `email` is allowed to be the same if current user session is the owner of it
            if (sessionEmail && sessionEmail === value?.toLowerCase()) {
               return true;
            }

            // if there is no `email` being passed in (ex. only with updates) then it's ok to be blank 
            if (sessionEmail && optional && value === undefined) {
               return true;
            }


            const userCol = await userCollection();
            const foundUser = await userCol.findOne({ email: value.toLowerCase() });

            if (foundUser) {
               message = message || `${this.schema.spec.label} already taken`;
               return testContext.createError({ message });
            }

            return true;
         }
      )
   })


   /**
    * Adds a method to Yup that Hits up MongoDB and checks if the `username` is unique
    */
   yup.addMethod(yup.string, "uniqueUsername", function uniqueUsername(message, userCollection) {

      return this.label("Username").test(
         "uniqueUsername", 
         message, 
         async function (value, testContext) {

            if (!userCollection)
               throw new Error("Please provide a MongoDB Collection");
            if (!(typeof userCollection !== Collection))
               throw new Error(
                  "userCollection is not an instance of a MongoDB Collection", 
                  {cause: userCollection}
               );

            // get the `context` passed into the original top-level `validate()`
            // NOTE: used for executing differently depending on if there is a user session or not
            const validationContext = testContext?.options?.context;

            // check whether this is required or has been set optional by `requiredIfNotLoggedIn()`
            const optional = validationContext?.optional;
            
            // grab session context if exists
            const sessionUsername = validationContext?.session?.user?.profile?.username?.toLowerCase();

            // `username` is allowed to be the same if current user session is the owner of it
            if (sessionUsername && sessionUsername === value?.toLowerCase()) {
               return true;
            }

            // if there is no `username` being passed in (ex. only with updates) then it's ok to be blank 
            if (sessionUsername && optional && value === undefined) {
               return true;
            }


            // collation is supported on `db.collection.find()` and not `db.collection.findOne()`
            const userCol = await userCollection();
            const foundUser = await userCol.find({ "profile.username": value }).collation(
               { locale: "en", strength: 2 }
            ).toArray();

            if (foundUser.length) {
               message = message || `${this.schema.spec.label} already taken`;
               return testContext.createError({ message });
            }

            return true;
         }
      )
   })
}
