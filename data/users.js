import { ObjectId } from "mongodb";
import bcrypt from "bcrypt";
import db from "../config/mongoCollections.js";

const { users } = db;

/**
 * local frozen `User` class which is exposed through `userFunctions` at the bottom.
 */
const User = Object.freeze(class User {

   /** 
    * prevent arbitrary access role modification by freezing this.
    */ 
   static roles = Object.freeze({
      USER: "user",
      MODERATOR: "moderator",
      ADMIN: "admin"
   })

   // private fields used for caching server stats, etc. right after every server restart
   static #totalUserCount;
   static #totalBannedUserCount;

   // password salting config
   static #targetHashTimeSeconds = 3;  // hash time will at least be this value
   static #optimalSaltRounds;

   // default props for each user instance
   _id;         // note: `insertOne()` actually mutates this class instance and adds `_id`
   email;
   password;
   role         = User.roles.USER;
   zipcode;
   profile;
   settings;
   isBanned     = false;
   friends      = [];
   creationDate = new Date();
   lastUpdated  = new Date();


   // `User` class is local to this file, these will already be validated in `userFunctions`
   constructor({email, password, role, zipcode, profile, settings}) {
      this.email      = email,
      this.password   = password,
      this.role       = role,     
      this.zipcode    = zipcode,
      this.profile    = profile,              
      this.settings   = settings

      User.#incrementTotalUserCount();
   }

   /**
    * Hashes a value and automatically calculates the optimal salt rounds if necessary.
    * 
    * @param {string} value      - The value to hash (ex. password)
    * @returns {Promise<string>}   A promise to resolve with the encrypted data or reject with an `Error`
    */
   static async hash(value) {
      if (!User.#optimalSaltRounds) await User.calculateOptimalSaltRounds();

      return await bcrypt.hash(value, User.getOptimalSaltRounds());
   }


   // ~~~~~~~~~~~~~ //
   // PUBLIC STATIC //
   // ~~~~~~~~~~~~~ //
   // (should all be exposed in `userFunctions`) //

   // ~ GETTERS

   static getTotalUserCount() {
      return User.#totalUserCount;
   }

   static getTotalBannedUserCount() {
      return User.#totalBannedUserCount;
   }

   static getTotalLegitUserCount() {
      return User.#totalUserCount - User.#totalBannedUserCount;
   }

   static getOptimalSaltRounds() {
      return User.#optimalSaltRounds;
   }


   // ############## //
   // PRIVATE STATIC //
   // ############## //

   // # SETTERS

   // mirror server user count & prevents inflating user numbers with private method
   static #incrementTotalUserCount() {
      User.#totalUserCount = (User.#totalUserCount || 0) + 1;

      return;
   }

   // should be called as soon as server starts up for caching efficiency
   static async #setLatestTotalUserCount() {

      // see: "https://www.mongodb.com/docs/drivers/node/current/crud/query/count/"
      // `.hint()` improves perf somewhat
      const userCollection = await users();
      User.#totalUserCount = await userCollection.countDocuments({}).hint("_id");
      return;
   }

   // should also be called as soon as server starts up for caching efficiency
   static async #setLatestTotalBannedUserCount() {
      const userCollection = await users();
      User.#totalBannedUserCount = await userCollection.countDocuments({ isBanned: true });
      return;
   }

   static #setOptimalSaltRounds(optimalSaltRounds) {
      User.#optimalSaltRounds = optimalSaltRounds;
      return;
   }


   // !!!!!!!!!!!! //
   // INITIALIZERS //
   // !!!!!!!!!!!! //

   /**
    * Calculates optimal salt rounds which scales to computing power.
    * Modified from: https://stackoverflow.com/a/61304956
    * 
    * @returns {void}
    */
   static async calculateOptimalSaltRounds() {

      // setting an initial low value so we can calculate 
      // a benchmark faster which we then can scale easily
      const STARTING_SALT_DO_NOT_USE = 11;

      let minSaltRounds = STARTING_SALT_DO_NOT_USE;  // set starting default
      const absoluteMinHashTimeSeconds = 1.25;
      const benchmarkPW = "ThisIsThe5thWorstPasswordEver";

      // benchmark absolute minimum salt rounds
      const startTime = performance.now();
      await bcrypt.hash(benchmarkPW, minSaltRounds);
      const endTime = performance.now();

      let secondsElapsed = (endTime - startTime) / 1000;

      // every additional salt round roughly doubles the hashing time
      while (secondsElapsed < absoluteMinHashTimeSeconds) {
         ++minSaltRounds;
         secondsElapsed *= 2;
      }

      console.log("ABSOLUTE MINIMUM SALT ROUNDS:", minSaltRounds);

      // calculate optimal salt rounds
      let optimalSaltRounds = minSaltRounds;         // set starting default

      while (secondsElapsed < User.#targetHashTimeSeconds) {
         ++optimalSaltRounds;
         secondsElapsed *= 2;
      }

      console.log("OPTIMAL SALT ROUNDS SET TO:", optimalSaltRounds);
      
      User.#setOptimalSaltRounds(optimalSaltRounds);
      return;
   }

   // retrieve and cache some user-specific stats
   static async restoreStats() {
      await User.#setLatestTotalUserCount();
      await User.#setLatestTotalBannedUserCount();
      return;
   }
}
)


/**
 * Public functions that deal with User-related operations
 */ 
const userFunctions = Object.freeze({

   /**
    * provides public access to 'enums' like user role types, getters for total user stats, etc.
    * ex. `userFunctions.server.roles.ADMIN` or `userFunctions.server.getTotalUserCount()`
    */
   get server() {
      return {
         roles:                      User.roles,
         getTotalUserCount:          User.getTotalUserCount,
         getTotalBannedUserCount:    User.getTotalBannedUserCount,
         getTotalLegitUserCount:     User.getTotalLegitUserCount,
         calculateOptimalSaltRounds: User.calculateOptimalSaltRounds
      };
   },

   // TODO: finish this
   /**
    * Creates a new `User` in MongoDB.
    * 
    * **WARNING**: For use with 100% validated data.
    * 
    * @param {Object} validUserData - 100% valid User data to create a new account with 
    * @returns {Promise<Object>}      an object with the User data and a success message
    */
   async createUser(validUserData) {

      if (!validUserData || Object(validUserData) !== validUserData)
         throw new Error("Please provide a validated `User` data object", {cause: validUserData});

      let {
         email,
         password, 
         role, 
         zipcode,
         profile, 
         settings
      } = validUserData;

      // build error object to later disseminate this in the HTML
      const errors = {};

      password = await User.hash(password);

      // the local constructor should only be used once everything is validated
      const newUser = new User({
         email,
         password, 
         role, 
         zipcode, 
         profile, 
         settings
      });

      const userCollection = await users();
      const userInfo = await userCollection.insertOne(newUser);
      if (!userInfo.insertedId)
         errors.creationError = "Could not create a new user";


      // must throw again if there's a problem creating a new user in db
      if (Object.keys(errors).length > 0) {
         throw new Error("Error creating user", {
            cause: {errors: errors}
         });
      }

      console.log("NEW USER CREATED");

      // TODO: censor OR remove private key/vals from returned User object
      return { user: newUser, success: true };
   },

   /**
    * Retrieves a `User` by `_id` in MongoDB.
    * 
    * **WARNING**: For use with 100% validated data.
    * 
    * @param {ObjectId} userId - 100% valid `ObjectId` to search a User by
    * @returns {Promise<Object>} an object with the User data and a success message
    */
   async getUserById(userId) {

      if (!userId) throw new Error("Please provide a validated `User` id", {cause: userId});

      const userCollection = await users();
      const user = await userCollection.findOne({ _id: ObjectId.createFromHexString(userId) });

      if (!user) {
         throw new Error(`User with id ${userId} does not exist`, {
            cause: {value: userId}
         });
      }

      return { user: user, success: true };
   },

   // TODO: check if we have the necessary permission to update a user :D !!
   /**
    * Updates a `User` by `_id` in MongoDB.
    * 
    * **WARNING**: For use with 100% validated data.
    * 
    * @param {ObjectId} userId        - 100% valid `ObjectId` to search a User by
    * @param {Object}   validUserData - 100% valid User data to update an account with
    * @returns {Promise<Object>}        an object with the User data and a success message
    */
   async updateUser(userId, validUserData) {

      if (!userId) 
         throw new Error("Please provide a validated `User` id", {cause: userId});
      if (!validUserData || Object(validUserData) !== validUserData)
         throw new Error("Please provide a validated `User` data object", {cause: validUserData});

      const userCollection = await users();
		const updateInfo = await userCollection.updateOne(
			{ _id: ObjectId.createFromHexString(userId) }, 
			{ $set: { ...validUserData }}
		);

		if (updateInfo.matchedCount === 0)
			throw new Error(`Cannot find user to update with id ${userId}`, {
            cause: {value: userId}
         });
		if (!updateInfo.acknowledged || updateInfo.modifiedCount === 0)
			throw new Error("Unable to update user. Possibly the exact same info was provided", {
            cause: {value: userId}
         });

		return this.getUserById(userId);
   },

   // TODO: check if we have the necessary permission to delete a user :D !!
   /**
    * Deletes a `User` by `_id` in MongoDB.
    * 
    * **WARNING**: For use with 100% validated data.
    * 
    * @param {ObjectId} userId - 100% valid ObjectId to delete a User by
    * @returns {Promise<Object>} an object with the deleted User id and a success message
    */
   async deleteUser(userId) {

      if (!userId) throw new Error("Please provide a validated `User` id", {cause: userId});

      const userCollection = await users();
      const deleteInfo = await userCollection.findOneAndDelete({
         _id: ObjectId.createFromHexString(userId)
      });

      if (!deleteInfo) {
         throw new Error(`Failed to delete user with id ${id}. Are you sure they exist?`, {
            cause: {value: userId}
         });
      }

      return {
         message: `Your account, ${deleteInfo.profile.username} has been successfully deleted!`,
         userId: userId,
         deleted: true
      }
   },

   // TODO
   async getUserZipCode(userId) {
      // userId = validators.validateId(userId, "User Id");


   }

   // TODO ...the rest
})

// CACHE some stats on server startup to avoid expensive `collection.countDocuments()`
// FIXME:
// await User.restoreStats();



export default userFunctions;
