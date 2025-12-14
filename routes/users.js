import Router from 'express';
import { validateSchema } from '../middleware/validation.mw.js';
import userData from '../data/users.js';
import postData from '../data/posts.js';
import friendData from '../data/friends.js';
import { avatarSchema, getResourceByIdSchema, usernameParamSchema, userSchema } from "../models/users.js";
import { renderErrorPage } from '../utils/errorUtils.js';
import postMiddleware from '../middleware/posts.mw.js';

const router = Router();

// FIXME: THIS IS JUST A DEMO, WILL BE INTEGRATED INTO SIGNUP
router.get("/avatar", async (req, res, next) => {
   res.status(200).render("avatar-upload", {
      avatarDimensions:              userData.server.avatarDimensions,
      avatarMaxOriginalSizeMB:       userData.server.getAvatarMaxOriginalSizeMB(),
      avatarMaxResizedSizeMB:        userData.server.getAvatarMaxResizedSizeMB(),
      avatarAllowedMIMETypes:        JSON.stringify([...userData.server.getAvatarAllowedMIMETypes()]),
      avatarAllowedTypesStr:         userData.server.getAvatarAllowedTypesStr(),
      avatarAllowedTypesFriendlyStr: userData.server.getAvatarAllowedTypesFriendlyStr(),

      title: "AVATAR TEST"
   });
})

// FIXME: THIS IS JUST A DEMO, WILL BE INTEGRATED INTO SIGNUP
router.post("/avatar", 
   validateSchema(avatarSchema, "body"), 
   async (req, res, next) => {

   const resizedBlobSize       = new Blob([req.body?.resized]).size;
   const resizedSquareBlobSize = new Blob([req.body?.resizedSquare]).size;
   const maximumSizeBytes      = userData.server.getAvatarMaxResizedSizeMB() * 1000000;

   if (resizedBlobSize > maximumSizeBytes || resizedSquareBlobSize > maximumSizeBytes) {
      return res.status(413).json({ 
         error: "Upload failed", 
         message: `Avatar too large even after downscaling. Maximum: ${userData.server.getAvatarMaxResizedSizeMB()} MB`
      });
   }

   try {
      const avatarData = {
         profile: {
            avatar: {
               ...req.body 
            }
         }
      }

      const { user, success } = await userData.updateUser(req.session.user._id, avatarData);

      return res.render("avatar-success", { 
         username:         user.profile.username,
         avatar:           user.profile.avatar?.resizedSquare,
         avatarDimensions: userData.server.avatarDimensions
      });

   } catch (e) {
      console.error(e);
      return renderErrorPage(res, 500, e.message);
   }
})

// DEMO - this User creation route should be named "example.com/dashboard" or "example.com/app"
router.post("/", 
   validateSchema(userSchema, "body"), 
   async (req, res, next) => {

      try {
         const { user, success } = await userData.createUser(req.body);
         return res.status(201).json({ user, success });
         
      } catch (e) {
         console.error(e);
         return renderErrorPage(res, 500, e.message);

         // TODO: `return next(e)` instead and create a catch-all 500 err handler as the last `app.use(...)`
      }
   }
);

router.patch("/:id", 
   // FIXME: authenticate user
   validateSchema(
      [getResourceByIdSchema("User"), "params"],
      [userSchema, "body"],
   ), 
   async (req, res, next) => {

      const { id } = req.params;

      try {
         const { user, success } = await userData.updateUser(id, req.body);
         return res.status(200).json({ user, success });
         
      } catch (e) {
         console.error(e);
         return renderErrorPage(res, 404, e.message);

         // TODO: `return next(e)` instead and create a catch-all 500 err handler as the last `app.use(...)`
      }
   }
);

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

export default router;