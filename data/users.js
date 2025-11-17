import { ObjectId } from "mongodb";
import { users } from "../config/mongoCollections.js";

// local frozen `User` class which is exposed through `userFunctions` at the bottom
const User = Object.freeze(class User {

   // prevent arbitrary access role modification by freezing this
   static roles = Object.freeze({
      USER: "user",
      MODERATOR: "moderator",
      ADMIN: "admin"
   })

   // private fields used for caching server stats right after every server restart
   static #totalUserCount;
   static #totalBannedUserCount;

   // default props for each user instance
   _id;
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
      this._id        = new ObjectId();
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

      email = email.trim();

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

      role = role.trim();

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

      username = username.trim();

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
         return true;

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


   // !!!!!!!!!!!! //
   // INITIALIZERS //
   // !!!!!!!!!!!! //

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

      // const userCollection = await users();
      // const userInfo = await userCollection.insertOne(newUser);
      // if (!userInfo.insertedId)
      //    errors.creationError = "Could not create a new user";


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

   // TODO
   async getUserById(userId) {
      userId = validators
   },

   // TODO
   async updateUser() {
      
   },

   // TODO
   async deleteUser(userId) {
      
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
