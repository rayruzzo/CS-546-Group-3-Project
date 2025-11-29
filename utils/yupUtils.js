import { Collection } from "mongodb";
import yup from "yup";

/**
 * Loads custom methods for Yup validation chains
 */
export function loadYupCustomMethods() {

   /**
    * Adds a sequential method to Yup that validates in order.
    * Used to avoid unecessary requests to server if value is obviously invalid.
    * Slightly modified from: https://github.com/jquense/yup/issues/851#issuecomment-1049705180
    */
   yup.addMethod(yup.string, "sequence", function (testFunctionArray) {
      return this.test(async (value, context) => {
         try {

            let arrayLen = testFunctionArray.length;
            for (let i = 0; i < arrayLen; i++) {
               await testFunctionArray[i]().validate(value);
            }

         } catch ({ message }) {
            return context.createError({ message });
         }

         // advance if all sequential tests are true
         return true;
      });
   });

   /**
    * Adds a method to Yup that Hits up MongoDB and checks if the `email` is unique
    */
   yup.addMethod(yup.string, "uniqueEmail", function (message, userCollection) {

      return this.label("Email").test(
         "uniqueEmail", 
         message, 
         async function (value, context) {
            
            if (!userCollection)
               throw new Error("Please provide a MongoDB Collection");
            if (!(typeof userCollection !== Collection))
               throw new Error(
                  "userCollection is not a MongoDB Collection", 
                  {cause: userCollection}
               );               

            const userCol = await userCollection();
            const emailExists = await userCol.findOne({ "email": value });

            if (emailExists) {
               message = message || `${this.schema.spec.label} already taken`;
               return context.createError({ message });
            }

            return true;
         }
      )
   })

   /**
    * Adds a method to Yup that Hits up MongoDB and checks if the `username` is unique
    */
   yup.addMethod(yup.string, "uniqueUsername", function (message, userCollection) {

      return this.label("Username").test(
         "uniqueUsername", 
         message, 
         async function (value, context) {

            if (!userCollection)
               throw new Error("Please provide a MongoDB Collection");
            if (!(typeof userCollection !== Collection))
               throw new Error(
                  "userCollection is not an instance of a MongoDB Collection", 
                  {cause: userCollection}
               );

            const userCol = await userCollection();
            const usernameExists = await userCol.findOne({ "profile.username": value });

            if (usernameExists) {
               message = message || `${this.schema.spec.label} already taken`;
               return context.createError({ message });
            }

            return true;
         }
      )
   })
}
