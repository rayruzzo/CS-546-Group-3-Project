import Router from 'express';
import { validateSchema } from '../middleware/validation.mw.js';
import userData from '../data/users.js';
import postData from '../data/posts.js';
import friendData from '../data/friends.js';
import { avatarSchema, getResourceByIdSchema, SCHEMA_CONFIG, usernameParamSchema, userSchema } from "../models/users.js";
import { renderErrorPage } from '../utils/errorUtils.js';
import postMiddleware from '../middleware/posts.mw.js';
import { shapeUserData } from '../middleware/shapeUser.mw.js';

const router = Router();

// // FIXME: THIS IS JUST A DEMO, WILL BE INTEGRATED INTO SIGNUP
// router.get("/avatar", async (req, res, next) => {
//    res.status(200).render("avatar-upload", {
//       avatarDimensions:              userData.server.avatarDimensions,
//       avatarMaxOriginalSizeMB:       userData.server.getAvatarMaxOriginalSizeMB(),
//       avatarMaxResizedSizeMB:        userData.server.getAvatarMaxResizedSizeMB(),
//       avatarAllowedMIMETypes:        JSON.stringify([...userData.server.getAvatarAllowedMIMETypes()]),
//       avatarAllowedTypesStr:         userData.server.getAvatarAllowedTypesStr(),
//       avatarAllowedTypesFriendlyStr: userData.server.getAvatarAllowedTypesFriendlyStr(),

//       title: "AVATAR TEST"
//    });
// })

// // FIXME: THIS IS JUST A DEMO, WILL BE INTEGRATED INTO SIGNUP
// router.post("/avatar", 
//    validateSchema(avatarSchema, "body"), 
//    async (req, res, next) => {

//    const resizedBlobSize       = new Blob([req.body?.resized]).size;
//    const resizedSquareBlobSize = new Blob([req.body?.resizedSquare]).size;
//    const maximumSizeBytes      = userData.server.getAvatarMaxResizedSizeMB() * 1000000;

//    if (resizedBlobSize > maximumSizeBytes || resizedSquareBlobSize > maximumSizeBytes) {
//       return res.status(413).json({ 
//          error: "Upload failed", 
//          message: `Avatar too large even after downscaling. Maximum: ${userData.server.getAvatarMaxResizedSizeMB()} MB`
//       });
//    }

//    try {
//       const avatarData = {
//          profile: {
//             avatar: {
//                ...req.body 
//             }
//          }
//       }

//       const { user, success } = await userData.updateUser(req.session.user._id, avatarData);

//       return res.render("avatar-success", { 
//          username:         user.profile.username,
//          avatar:           user.profile.avatar?.resizedSquare,
//          avatarDimensions: userData.server.avatarDimensions
//       });

//    } catch (e) {
//       console.error(e);
//       return renderErrorPage(res, 500, e.message);
//    }
// })

// // DEMO - this User creation route should be named "example.com/dashboard" or "example.com/app"
// router.post("/", 
//    validateSchema(userSchema, "body"), 
//    async (req, res, next) => {

//       try {
//          const { user, success } = await userData.createUser(req.body);
//          return res.status(201).json({ user, success });
         
//       } catch (e) {
//          console.error(e);
//          return renderErrorPage(res, 500, e.message);

//          // TODO: `return next(e)` instead and create a catch-all 500 err handler as the last `app.use(...)`
//       }
//    }
// );

// router.patch("/:id", 
//    // FIXME: authenticate user
//    validateSchema(
//       [getResourceByIdSchema("User"), "params"],
//       [userSchema, "body"],
//    ), 
//    async (req, res, next) => {

//       const { id } = req.params;

//       try {
//          const { user, success } = await userData.updateUser(id, req.body);
//          return res.status(200).json({ user, success });
         
//       } catch (e) {
//          console.error(e);
//          return renderErrorPage(res, 404, e.message);

//          // TODO: `return next(e)` instead and create a catch-all 500 err handler as the last `app.use(...)`
//       }
//    }
// );

router.get("/:username", 
   validateSchema(usernameParamSchema, "params"), 
   postMiddleware.isProfileOwnerDisplay,
   async (req, res, next) => {
   
      // the requested `user` with the `username` param has been attached to `res.locals`
      const { requestedUser } = res.locals;

      try {
         const postsList     = await postData.filterPosts({userId: requestedUser._id.toString()});
         const enrichedPosts = await postData.enrichPostsWithUserAndLocation(postsList);

         // get your mutual friends
         const { mutualFriendIds, friendsWith } = await friendData.getMutualFriends(
            requestedUser._id.toString(), req.session?.user._id.toString()
         );

         return res.render("profile", {
            zipcode:          requestedUser.zipcode,
            role:             requestedUser.role,
            profile: {
               username:      requestedUser.profile?.username,
               firstName:     requestedUser.profile?.firstName,
               lastName:      requestedUser.profile?.lastName,
               avatar:        requestedUser.profile?.avatar?.resizedSquare,
               bio:           requestedUser.profile?.bio
            },
            friends:          requestedUser.friends,
            friendsWith:      friendsWith,
            mutualFriendIds:  mutualFriendIds,
            numMutualFriends: mutualFriendIds?.size ?? mutualFriendIds?.length,
            creationDate:     requestedUser.creationDate,
            lastUpdated:      requestedUser.lastUpdated,

            posts:            enrichedPosts,

            avatarDimensions: userData.server.avatarDimensions || 200,
            title:            requestedUser.profile?.username
         });
         
      } catch (e) {
         console.error(e);
         return renderErrorPage(res, 500, e.message);

         // TODO: `return next(e)` instead and create a catch-all 500 err handler as the last `app.use(...)`
      }
   }
);

router.get("/:username/settings", 
   validateSchema(usernameParamSchema, "params"), 
   postMiddleware.isProfileOwnerDisplay,
   (req, res, next) => {

      // the requested `user` with the `username` param has been attached to `res.locals`
      const { requestedUser } = res.locals;

      if (res.locals.isPostOwner) {
         return res.render("settings", {
            title: "Settings",

            email:            requestedUser.email,
            zipcode:          requestedUser.zipcode,
            role:             requestedUser.role,
            profile: {
               username:      requestedUser.profile?.username,
               firstName:     requestedUser.profile?.firstName,
               lastName:      requestedUser.profile?.lastName,
               avatar:        requestedUser.profile?.avatar?.resizedSquare,
               bio:           requestedUser.profile?.bio
            },

            avatarDimensions:              userData.server.avatarDimensions,
            avatarMaxOriginalSizeMB:       userData.server.getAvatarMaxOriginalSizeMB(),
            avatarMaxResizedSizeMB:        userData.server.getAvatarMaxResizedSizeMB(),
            avatarAllowedMIMETypes:        JSON.stringify([...userData.server.getAvatarAllowedMIMETypes()]),
            avatarAllowedTypesStr:         userData.server.getAvatarAllowedTypesStr(),
            avatarAllowedTypesFriendlyStr: userData.server.getAvatarAllowedTypesFriendlyStr(),

            passwordErrorMessage: SCHEMA_CONFIG.password.message,
            SCHEMA_CONFIG: {
               username: {
                  ...SCHEMA_CONFIG.username,
                  regex: SCHEMA_CONFIG.username.regex.toString()
                              .slice(1, SCHEMA_CONFIG.username.regex.toString().length - 1),
               },
               password: {
                  ...SCHEMA_CONFIG.password,
                  regex: SCHEMA_CONFIG.password.regex.toString()
                              .slice(1, SCHEMA_CONFIG.password.regex.toString().length - 1),
               },
               zipcode: {
                  ...SCHEMA_CONFIG.zipcode,
                  regex: SCHEMA_CONFIG.zipcode.regex.toString()
                              .slice(1, SCHEMA_CONFIG.zipcode.regex.toString().length - 1),
               },
               nameBase: {
                  ...SCHEMA_CONFIG.nameBase,
               },
               bio: {
                  ...SCHEMA_CONFIG.bio
               }
            },
         });
      } else {
         return renderErrorPage(res, 403, "You can only edit your own profile");
      }
   }
);

router.patch("/:username/settings",
   validateSchema(usernameParamSchema, "params"), 
   postMiddleware.isProfileOwnerDisplay,
   shapeUserData,
   async (req, res, next) => {

      // the requested `user` with the `username` param has been attached to `res.locals`
      const { requestedUser } = res.locals;

      const resizedBlobSize       = new Blob([req.body?.profile?.avatar?.resized]).size;
      const resizedSquareBlobSize = new Blob([req.body?.profile?.avatar?.resizedSquare]).size;
      const maximumSizeBytes      = userData.server.getAvatarMaxResizedSizeMB() * 1000000;

      if (resizedBlobSize > maximumSizeBytes || resizedSquareBlobSize > maximumSizeBytes) {
         return res.status(413).json({ 
            error: "Upload failed", 
            message: `Avatar too large even after downscaling. Maximum: ${userData.server.getAvatarMaxResizedSizeMB()} MB`
         });
      }

      try {

         const { user, success } = await userData.updateUser(req.session.user._id, req.body);


         req.session.user = {
            _id: user._id.toString(),
            email: user.email,
            zipcode: user.zipcode,
            role: user.role,
            username: user.profile?.username || ""
         };

         return res.render("settings", { 
            title: "Settings",

            email:            requestedUser.email,
            zipcode:          requestedUser.zipcode,
            role:             requestedUser.role,
            profile: {
               username:      requestedUser.profile?.username,
               firstName:     requestedUser.profile?.firstName,
               lastName:      requestedUser.profile?.lastName,
               avatar:        requestedUser.profile?.avatar?.resizedSquare,
               bio:           requestedUser.profile?.bio
            },

            avatarDimensions:              userData.server.avatarDimensions,
            avatarMaxOriginalSizeMB:       userData.server.getAvatarMaxOriginalSizeMB(),
            avatarMaxResizedSizeMB:        userData.server.getAvatarMaxResizedSizeMB(),
            avatarAllowedMIMETypes:        JSON.stringify([...userData.server.getAvatarAllowedMIMETypes()]),
            avatarAllowedTypesStr:         userData.server.getAvatarAllowedTypesStr(),
            avatarAllowedTypesFriendlyStr: userData.server.getAvatarAllowedTypesFriendlyStr(),

            passwordErrorMessage: SCHEMA_CONFIG.password.message,
            SCHEMA_CONFIG: {
               username: {
                  ...SCHEMA_CONFIG.username,
                  regex: SCHEMA_CONFIG.username.regex.toString()
                              .slice(1, SCHEMA_CONFIG.username.regex.toString().length - 1),
               },
               password: {
                  ...SCHEMA_CONFIG.password,
                  regex: SCHEMA_CONFIG.password.regex.toString()
                              .slice(1, SCHEMA_CONFIG.password.regex.toString().length - 1),
               },
               zipcode: {
                  ...SCHEMA_CONFIG.zipcode,
                  regex: SCHEMA_CONFIG.zipcode.regex.toString()
                              .slice(1, SCHEMA_CONFIG.zipcode.regex.toString().length - 1),
               },
               nameBase: {
                  ...SCHEMA_CONFIG.nameBase,
               },
               bio: {
                  ...SCHEMA_CONFIG.bio
               }
            },
         });

      } catch (e) {
         console.error(e);
         return renderErrorPage(res, 500, e.message);
      }
   }
)

export default router;