import { ValidationError } from "yup";
import { dbConnection } from "../config/mongoConnection.js";
import userData, {  } from "../data/users.js";
import { objectIdSchema, userSchema } from "../models/users.js";

function simplifyYupError(yupError) {

   // if (typeof yupError !== 'object')
   //    return yupError;
   
   // if (Array.isArray(yupError))
   //    return yupError.map(simplifyYupError);

   // return Object.entries(yupError).map(([key, val]) => {
   //    return [key, simplifyYupError(val)]
   // })
   // const validationErr = new ValidationError(yupError)
   // console.log(validationErr)

   yupError?.inner?.map((err) => (delete err.stack));
   delete yupError.stack;

   return yupError;
}

export async function testUsers() {

   // reset database
   const db = await dbConnection();
   await db.dropDatabase();

   /////////////////////////
   // OBJECTID VALIDATION //
   /////////////////////////
   
   // FAIL
   try {
      const objectIdSchemaTest = await objectIdSchema.validate(
         ""
      )
      console.error("This is supposed to fail:", objectIdSchemaTest)
   } catch (e) {
      console.trace(simplifyYupError(e));
   } finally {
      console.log("\n");
   }

   // FAIL
   try {
      const objectIdSchemaTest = await objectIdSchema.validate(
         "BAD-ID"
      )
      console.error("This is supposed to fail:", objectIdSchemaTest)
   } catch (e) {
      console.trace(simplifyYupError(e));
   } finally {
      console.log("\n");
   }

   // SUCCESS
   try {
      const objectIdSchemaTest = await objectIdSchema.validate(
         "69237ef72252de835f841123"
      )
      console.log("Valid ObjectId:", objectIdSchemaTest);
   } catch (e) {
      console.trace(simplifyYupError(e));
   } finally {
      console.log("\n");
   }

   ////////////////////////////
   // USER SCHEMA VALIDATION //
   ////////////////////////////

   // FAIL
   try {
      const userSchemaTest = await userSchema.validate({
         email: "not an email",
         password: "  !shortP1",
         // role: "user",
         zipcode: "      9021a   ",
         // location: "City, State",
         profile: {
            username: "aa",
            firstName: "A",
            dob: "hello",
            invalidProfileKey: true
         },
         settings: {
            dmsEnabled: "g",
            superuser: true,
            dopeTheme: true
         },
         invalidKey: "cool"

      }, {abortEarly: false})

      console.log(userSchemaTest)
      
   } catch (e) {
      // const errors = e?.inner?.map((err) => ({
      //    message: err.message,
      //    type: err.type, 
      //    path: err.path,
      //    param: err.params, 
      //    errors: err.errors
      // }))

      const { inner } = e;
      // console.log(e); 
      // const err = e;
      console.log("SIMPLIFYING YUP ERROR");
      const errors2 = simplifyYupError(e);

      // can't find out why Yup does not include in it's stack trace the line  where 
      // the error occurred, so I am using `console.trace()` here as a workaround.
      console.trace(errors2)
   } finally {
      console.log("\n");
   }

   // SUCCESS
   try {
      const userSchemaTest = await userSchema.validate({
         email: "valid@valid.com",
         password: "thisPasswordIsValid123!?",
         // role: "user",
         zipcode: "      99999   ",
         location: "City, State",
         profile: {
            username: "bagels420",
            firstName: "Arnold",
            dob: "1/1/2005",
         },
         settings: {
            dmsEnabled: true,
         },

      }, {abortEarly: false})

      console.log(userSchemaTest)

      const validUser = await userData.createUser({
         email: userSchemaTest.email,
         password: userSchemaTest.password,
         role: userSchemaTest.role,
         zipcode: userSchemaTest.zipcode,
         location: userSchemaTest.location,
         profile: {
            username: userSchemaTest.profile.username,
            firstName: userSchemaTest.profile.firstName,
            dob: userSchemaTest.profile.dob,
         },
         settings: {
            dmsEnabled: userSchemaTest.settings.dmsEnabled,
         },
      })
      
      console.log(validUser)
      
   } catch (e) {
      const errors2 = simplifyYupError(e);

      // can't find out why Yup does not include in it's stack trace the line  where 
      // the error occurred, so I am using `console.trace()` here as a workaround.
      console.trace(errors2)
   } finally {
      console.log("\n");
   }

   // FAIL - username already exists!
   try {
      const userSchemaTest = await userSchema.validate({
         email: "valid@valid.com",
         password: "thisPasswordIsValid123!?",
         role: "ROLE",
         zipcode: "99999",
         location: "City, State",
         profile: {
            username: "bagels420",
            firstName: "Not Arnold",
            dob: "1/1/2002",
         },
         settings: {
            dmsEnabled: true,
         },

      }, {abortEarly: false})

      console.log(userSchemaTest)
      
   } catch (e) {
      // const errors = e?.inner?.map((err) => ({
      //    message: err.message,
      //    type: err.type, 
      //    path: err.path,
      //    param: err.params, 
      //    errors: err.errors
      // }))


      // console.log(e); 
      console.log("SIMPLIFYING YUP ERROR");
      const errors2 = simplifyYupError(e);

      // can't find out why Yup does not include in it's stack trace the line  where 
      // the error occurred, so I am using `console.trace()` here as a workaround.
      console.trace(errors2)
   } finally {
      console.log("\n");
   }



   /////////////////
   // CREATE USER //
   /////////////////

   // SUCCESS
   try {
      // const test = userData.createUser({

      // })
      
   } catch (e) {
      console.error(e);
   }


   // FAIL
}
