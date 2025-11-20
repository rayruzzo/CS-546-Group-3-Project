import { ObjectId } from "mongodb";
import bcrypt from "bcrypt";
import { users } from "../config/mongoCollections.js";

// local frozen `User` class which is exposed through `userFunctions` at the bottom
const User = Object.freeze(class User {

   // prevent arbitrary access role modification by freezing this
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
   location;
   profile;
   dmsEnabled   = true;
   isBanned     = false;
   friends      = [];
   creationDate = new Date();
   lastUpdated  = new Date();


   // `User` class is local to this file, these will already be validated in `userFunctions`
   constructor({email, password, role, zipcode, profile, dmsEnabled}) {
      this.email      = email,
      this.password   = password,             // TODO: hash & salt this password
      this.role       = role,     
      this.zipcode    = zipcode,
      this.profile    = profile,              
      this.dmsEnabled = dmsEnabled

      User.#incrementTotalUserCount();
   }

   static async validateEmail(email) {

      // TODO: replace this general validation section with the group's validation function
      if (!email) 
         return {error: `email is required`};

      if (typeof email !== "string") 
         return {error: `email must be a string`};

      email = email.trim().toLowerCase();

      if (email.length === 0)
         return {error: `email cannot be an empty string`};

      // TODO: invalidate if not valid email address (maybe use a library)

      // last step - check if someone else is already using this email
      const userCollection = await users();
      const userExists = await userCollection.findOne({ email: email });

      if (userExists)
         return {error: `User with email ${email} already exists`};

      return {result: email};
   }

   // TODO: validate password
   // #validatePassword(password) {

   // }

   static validateRole(role) {
      
      // TODO: replace this general validation section with the group's validation function
      if (!role) 
         return {error: `role is required`};

      if (typeof role !== "string") 
         return {error: `role must be a string`};

      role = role.trim().toLowerCase();

      if (role.length === 0)
         return {error: `role cannot be an empty string`};

      // further role validation specific to `User` class
      if (!Object.values(User.roles).includes(role))
         return {error: `role is not a valid role within our system`};

      return {result: role};
   }

   static async validateUsername(username) {

      // TODO: replace this general string validation section with the group's validation function
      if (!username) 
         return {error: `username is required`};

      if (typeof username !== "string") 
         return {error: `username must be a string`};

      username = username.trim().toLowerCase();

      if (username.length === 0)
         return {error: `username cannot be an empty string`};

      // further username validation specific to `User` class
      const userCollection = await users();
      const usernameExists = await userCollection.findOne({ "profile.username": username });

      if (usernameExists)
         return {error: `${username} has been taken`};

      return {result: username};
   }

   static validateName(name, nameType, {required = true} = {}) {

      // TODO: replace this general string validation section with the group's validation function
      if (required && !name) 
         return {error: `${nameType} is required`};
      else if (!required)
         return {result: name};

      if (typeof name !== "string") 
         return {error: `${nameType} must be a string`};

      name = name.trim();

      if (name.length === 0)
         return {error: `${nameType} cannot be an empty string`};

      return {result: name};
   }

   // unsure what kind of date format we want to parse but here's one from my lab (MM/DD/YYYY)
   static validateDOB(dob) {

      // TODO: replace this general string validation section with the group's validation function
      if (!dob) 
         return {error: `date of birth is required`};

      if (typeof dob !== "string") 
         return {error: `date of birth must be a string`};

      dob = dob.trim();

      if (dob.length === 0)
         return {error: `date of birth cannot be an empty string`};

      
      // first do bare minimum sifting of the string, we are gonna narrow it down!
      const bigSifterReg = /^([0-9][0-9])\/([0-3][0-9])\/([1-9][0-9]{3})$/

      if (!bigSifterReg.test(dob)) {
         return {error: "date of birth not in valid MM/DD/YYYY format"}
      }

      // we now for sure at least have only integers for the date values
      const captureGroups = dob.match(bigSifterReg);

      // the actual groups start at index 1
      const month = parseInt(captureGroups[1]) - 1;   // month is index based
      const day   = parseInt(captureGroups[2]);
      const year  = parseInt(captureGroups[3]);

      // `new Date()` tries to parse strings by adding
      // the surplus of days of a certain month into
      // the next month, I have still no idea why...
      // which is why I'm saving the input values
      const dateObj = new Date(dob);                  // returns 'Invalid Date' for an obvious bad date
      const minYear = new Date().getFullYear() - 150; // nobody living today is this old
      const maxYear = new Date().getFullYear() + 150;

      if (isNaN(dateObj.valueOf()))       // an invalid month and a day < 1 or > 31 would hit this, etc.
         return {error: "Not a valid date"};
      if (dateObj.getMonth() !== month) {   // day is more than the number of days that month but < 32
         return {error: "The day in your date of birth must be a valid day in the month"};
      }
      if (
         isNaN(dateObj.getDate()) || 
         dateObj.getDate() !== day
      ) {                                   // we would probably never branch here, but just in case
         return {error: "The day in your date of birth must be a valid day in the month"};
      }
      if (year < minYear || year > maxYear) {
         return {error: `The year in your date of birth must be between ${minYear} and ${maxYear}`};
      }
      
      return {result: dob};
   }

   // TODO: finish this
   static async validateProfile(
      {
         username,              // REQUIRED
         firstName,             // REQUIRED
         lastName       = null, // OPTIONAL
         dob,                   // REQUIRED
         bio            = null, // OPTIONAL
         profilePicture = null, // OPTIONAL
         ...invalidArgs
      } = {}
   ) {
      // build error object to later disseminate this in the HTML
      const errors = {};

      const argsArr = [...arguments];

      // check if too many arguments or no arguments provided
      if (argsArr.length > 1)
         errors.tooManyArguments = true;
      else if (!argsArr.length || typeof argsArr[0] === "undefined" || !Object.keys(argsArr[0]).length)
         errors.noArgumentsProvided = true;

      // check if extraneous args are provided to the defined object parameter
      if (invalidArgs && Object.keys(invalidArgs).length)
         errors.invalidArgumentsProvided = Object.keys(invalidArgs);

      // TODO: properly validate username
      // const usernameInfo = User.validateUsername(username);
      // if (usernameInfo.error)
      //    errors.username = usernameInfo.error;
      // else
      //    username = usernameInfo.result;

      const firstNameInfo = User.validateName(firstName, "First name");
      if (firstNameInfo.error)
         errors.firstName = firstNameInfo.error;
      else
         firstName = firstNameInfo.result;

      const lastNameInfo = User.validateName(lastName, "Last name", {required: false});
      if (lastNameInfo.error)
         errors.lastName = lastNameInfo.error;
      else
         lastName = lastNameInfo.result;

      // TODO: finish setting up DOB as a date suited for a server
      const dobInfo = User.validateDOB(dob);
      if (dobInfo.error)
         errors.dob = dobInfo.error;
      else
         dob = dobInfo.result;

      // TODO: validate OPTIONAL bio
      // const bioInfo = User.validateBio(bio, {required: false});
      // if (bioInfo.error)
      //    errors.bio = bioInfo.error;
      // else
      //    bio = bioInfo.result;

      // TODO: validate OPTIONAL profile picture file itself
      // const profilePictureInfo = User.validateProfilePicture(profilePicture, {required: false});
      // if (profilePictureInfo.error)
      //    errors.profilePicture = profilePictureInfo.error;
      // else
      //    profilePicture = profilePictureInfo.result;

      if (Object.keys(errors).length > 0)
         return {errors: errors};

      return {
         result: {
            username,     
            firstName,    
            lastName,
            dob,
            bio,
            profilePicture
         }
      };
   }

   // TODO: probably imported from a Location object
   // #validateLocation() {
   // }

   // TODO: probably imported from a Location object
   // #validateZipCode() {
   // }

   // TODO: do not allow banned users as friends, lmao ;)
   // #validateFriend(friend) {
   
   // }


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


// functions which everyone can access
const userFunctions = Object.freeze({

   // provides public access to 'enums' like user role types, getters for total user stats, etc.
   // ex. `userFunctions.server.roles.ADMIN` or `userFunctions.server.getTotalUserCount()`
   get server() {
      return {
         roles:                   User.roles,
         getTotalUserCount:       User.getTotalUserCount,
         getTotalBannedUserCount: User.getTotalBannedUserCount,
         getTotalLegitUserCount:  User.getTotalLegitUserCount
      };
   },

   // TODO: finish this
   async createUser(
      {
         email, 
         password, 
         role, 
         zipcode, 
         location,
         profile, 
         dmsEnabled, 
         ...invalidArgs
      } = {}
   ) {
      // build error object to later disseminate this in the HTML
      const errors = {};

      const argsArr = [...arguments];

      // check if too many arguments or no arguments provided
      if (argsArr.length > 1)
         errors.tooManyArguments = true;
      else if (!argsArr.length || typeof argsArr[0] === "undefined" || !Object.keys(argsArr[0]).length)
         errors.noArgumentsProvided = true;

      // check if extraneous args are provided to the defined object parameter
      if (invalidArgs && Object.keys(invalidArgs).length)
         errors.invalidArgumentsProvided = Object.keys(invalidArgs);
      
      // TODO: validate email properly
      // const emailInfo = User.validateEmail(email);
      // if (emailInfo.error)
      //    errors.email = emailInfo.error;
      // else
      //    email = emailInfo.result;      // `.result` has the trimmed string, formatted date, etc.

      // TODO: validate password properly
      // const passwordInfo = User.validatePassword(password);
      // if (passwordInfo.error)
      //    errors.password = passwordInfo.error;
      // else
      //    password = passwordInfo.result;

      const roleInfo = User.validateRole(role);
      if (roleInfo.error)
         errors.role = roleInfo.error;
      else
         role = roleInfo.result;

      // TODO: validate zipcode properly
      // const zipCodeInfo = User.validateZipCode(zipcode);
      // if (zipCodeInfo.errors)
      //    errors.zipcode = zipCodeInfo.errors;
      // else
      //    zipcode = zipCodeInfo.result;

      // TODO: validate Location properly
      // const locationInfo = User.validateLocation(location);
      // if (locationInfo.errors)
      //    errors.location = locationInfo.errors;
      // else
      //    location = locationInfo.result;

      // TODO: finish validating profile
      const profileInfo = await User.validateProfile(profile || {});  // pass empty obj if `profile` is null
      if (profileInfo.errors)
         errors.profile = profileInfo.errors;
      else
         profile = profileInfo.result;

      if (typeof dmsEnabled !== "boolean")
         errors.dmsEnabled = "Please provide either true or false if you want to DM others";

      // throw w/errors object before attempting to create a new user
      if (Object.keys(errors).length > 0) {
         throw new Error("Error creating user", {
            cause: {errors: errors}
         });
      }


      // the local constructor should only be used once everything is validated
      const newUser = new User({
         email,
         password, 
         role, 
         zipcode, 
         profile, 
         dmsEnabled
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

      // FIXME: possibly save a trip to the server by already having the new `User` instance?
      return newUser;
   },

   async getUserById(userId) {

      const errors = {};
      
      // TODO: replace this general validation section with the group's validation function
      if (!userId) 
         errors.isRequired = `userId is required`;

      if (typeof userId !== "string") 
         errors.notString = `userId must be a string`;

      // prevent string methods from being called on non-strings
      if (!errors.notString) {
         userId = userId.trim();
         
         if (userId.length === 0)
            errors.isEmpty = `userId cannot be an empty string`;
   
         if (!ObjectId.isValid(userId))
            errors.invalidId = `Invalid userId`;
      }


      if (Object.keys(errors).length > 0) {
         throw new Error("Invalid userId", {
            cause: {
               errors: errors,
               value: userId
            }
         });
      }

      const userCollection = await users();
      const user = await userCollection.findOne({ _id: ObjectId.createFromHexString(userId) });

      if (!user) {
         throw new Error(`User with id ${userId} does not exist`, {
            cause: {value: userId}
         });
      }

      return user;
   },

   // TODO: check if we have the necessary permission to update a user :D !!
   async updateUser(
         userId,
         userData = {}
   ) {
      let {
         email, 
         password, 
         role, 
         zipcode, 
         location, 
         profile, 
         dmsEnabled, 
         ...invalidArgs
      } = userData || {};
      
      const errors = {};

      const argsArr = [...arguments];

      // check if too many or too little arguments provided
      if (argsArr.length > 2)
         errors.tooManyArguments = "Too many arguments. Required: (userId, {...userData})";
      else if (argsArr.length < 2)
         errors.notEnoughArguments = "Not enough arguments. Required: (userId, {...userData})";

      // throw immediately if arguments length is invalid on the surface
      if (Object.keys(errors).length > 0) {
         throw new Error("Invalid arguments", {cause: {errors: errors}});
      }

      // TODO: replace this general validation section with the group's validation function
      const userIdErrors = {};

      if (!userId) 
         userIdErrors.isRequired = `userId is required`;

      if (typeof userId !== "string") 
         userIdErrors.notString = `userId must be a string`;

      // prevent string methods from being called on non-strings
      if (!userIdErrors.notString) {

         userId = userId.trim();
         
         if (userId.length === 0)
            userIdErrors.isEmpty = `userId cannot be an empty string`;
         else if (!ObjectId.isValid(userId))
            userIdErrors.invalidId = `Invalid userId`;
      }

      // if userIdErrors exists, add to errors
      if (Object.keys(userIdErrors).length > 0) {
         errors.userId = userIdErrors;
      }

      // stop execution if provided user update data object is null
      if (typeof userData !== "object")
         errors.userData = "userData must be an object";
      else if (!userData || !Object.keys(userData).length)
         errors.userData = "userData to update cannot be empty";

      if (Object.keys(errors).length > 0) {
         throw new Error("Invalid arguments", {cause: {errors: errors}});
      }


      // check if extraneous args are provided to the defined userData object parameter
      if (invalidArgs && Object.keys(invalidArgs).length)
         errors.invalidArgumentsProvided = Object.keys(invalidArgs);

      // TODO: validate email properly
      // const emailInfo = User.validateEmail(email);
      // if (emailInfo.error)
      //    errors.email = emailInfo.error;
      // else
      //    email = emailInfo.result;

      // TODO: validate password properly
      // const passwordInfo = User.validatePassword(password);
      // if (passwordInfo.error)
      //    errors.password = passwordInfo.error;
      // else
      //    password = passwordInfo.result;

      const roleInfo = User.validateRole(role);
      if (roleInfo.error)
         errors.role = roleInfo.error;
      else
         role = roleInfo.result;

      // TODO: validate zipcode properly
      // const zipCodeInfo = User.validateZipCode(zipcode);
      // if (zipCodeInfo.errors)
      //    errors.zipcode = zipCodeInfo.errors;
      // else
      //    zipcode = zipCodeInfo.result;

      // TODO: validate Location properly
      // const locationInfo = User.validateLocation(location);
      // if (locationInfo.errors)
      //    errors.location = locationInfo.errors;
      // else
      //    location = locationInfo.result;

      // TODO: finish validating profile
      const profileInfo = await User.validateProfile(profile || {});  // pass empty obj if `profile` is null
      if (profileInfo.errors)
         errors.profile = profileInfo.errors;
      else
         profile = profileInfo.result;

      if (typeof dmsEnabled !== "boolean")
         errors.dmsEnabled = "Please provide either true or false if you want to DM others";

      // throw w/errors object before attempting to update a user
      if (Object.keys(errors).length > 0) {
         throw new Error("Cannot proceed to update user", {
            cause: {errors: errors}
         });
      }


      const userCollection = await users();
		const updateInfo = await userCollection.updateOne(
			{ _id: ObjectId.createFromHexString(userId) }, 
			{ $set: { ...userData }}
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
   async deleteUser(userId) {
      
      const errors = {};
      
      // TODO: replace this general validation section with the group's validation function
      if (!userId) 
         errors.isRequired = `userId is required`;

      if (typeof userId !== "string") 
         errors.notString = `userId must be a string`;

      // prevent string methods from being called on non-strings
      if (!errors.notString) {
         userId = userId.trim();
         
         if (userId.length === 0)
            errors.isEmpty = `userId cannot be an empty string`;
   
         if (!ObjectId.isValid(userId))
            errors.invalidId = `Invalid userId`;
      }


      if (Object.keys(errors).length > 0) {
         throw new Error("Invalid userId", {
            cause: {
               errors: errors,
               value: userId
            }
         });
      }

      const deleteInfo = await movieCol.findOneAndDelete({
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

// await calculation of optimal salt rounds just in case 
// user tries logging in/signing up immediately after server restart
await User.calculateOptimalSaltRounds();


export default userFunctions;
