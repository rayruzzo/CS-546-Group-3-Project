import express from "express";

/**
 * Shapes incoming data to be validated if it came from an HTML Form
 * 
 * @module shapeSignupData
 * @param {express.Request} req       - an Express server request object
 * @param {express.Response} res      - an Express server response object
 * @param {express.NextFunction} next   the next middleware to execute
 */
export function shapeSignupData(req, res, next) {

   const { email, username, password, dob, zipcode} = req.body;

   const shapedData = {
      email,
      password,
      zipcode,
      profile: {
         username,
         dob
      }
   }

   req.body = shapedData;

   next();
}