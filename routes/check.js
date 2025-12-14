import { Router } from "express";
import { validateSchema } from "../middleware/validation.mw.js";
import { 
   emailBodySchema, 
   usernameBodySchema,
   dobBodySchema, 
   zipcodeBodySchema 
} from "../models/users.js";
import locationData from "../data/locations.js";

const router = Router();

/**
 * Check email via `/check/email`
 */
router.post("/email", validateSchema(emailBodySchema, "body"), (req, res) => {
   return res.json({ success: true });
});

/**
 * Check username via `/check/username`
 */
router.post("/username", validateSchema(usernameBodySchema, "body"), (req, res) => {
   return res.json({ success: true });
});

/**
 * Check dob via `/check/dob`
 */
router.post("/dob", validateSchema(dobBodySchema, "body"), (req, res) => {
   return res.json({ success: true });
});

/**
 * Check zipcode via `/check/zipcode`
 */
router.post("/zipcode", 
   validateSchema(zipcodeBodySchema, "body"), 
   async (req, res) => {
   
      try {
         const location = await locationData.getLocationByZipcode(req.body?.zipcode);

         return res.json({ success: true });

      } catch (e) {
         console.error(e);
         return res.status(400).json({message: e.message});
      }
});



export default router;