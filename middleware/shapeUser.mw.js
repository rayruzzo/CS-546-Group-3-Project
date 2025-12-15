import express from "express";

/**
 * Shapes incoming data to be validated if it came from an HTML Form
 * 
 * @module shapeUserData
 * @param {express.Request} req       - an Express server request object
 * @param {express.Response} res      - an Express server response object
 * @param {express.NextFunction} next   the next middleware to execute
 */
export function shapeUserData(req, res, next) {

   const { 
      email, 
      username, 
      password, 
      dob, 
      zipcode, 
      firstName        = null,
      lastName         = null,
      bio              = null,
      resized          = null,
      resizedSquare    = null
   } = req.body;

   const shapedData = {
      email,
      password,
      zipcode,
      profile: {
         username,
         dob,
         firstName,
         lastName,
         bio,
         avatar: {
            resized: resized,
            resizedSquare: resizedSquare
         }
      }
   }

   req.body = shapedData;

   next();
}