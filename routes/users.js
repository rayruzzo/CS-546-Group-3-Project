import Router from 'express';
import { validateSchema } from '../middleware/validation.mw.js';
import userData from '../data/users.js';
import { getResourceByIdSchema, userSchema } from "../models/users.js";
import { renderErrorPage } from '../utils/errorUtils.js';

const router = Router();

// DEMO - this User creation route should be named "example.com/dashboard" or "example.com/app"
router.post("/", 
   validateSchema(userSchema, "body"), 
   async (req, res, next) => {

      try {
         const { user, success } = await userData.createUser(req.body);
         return res.status(201).json({ user, success });
         
      } catch (e) {
         console.error(e);
         res.status(500).json({ error: e.message });

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
         res.status(404).json({ error: e.message });

         // TODO: `return next(e)` instead and create a catch-all 500 err handler as the last `app.use(...)`
      }
   }
);

router.get("/:id", 
   // FIXME: authenticate user, if no session respond with 401 Unauthorized
   validateSchema(
      [getResourceByIdSchema("User"), "params"],
   ), 
   async (req, res, next) => {
   
      const { id } = req.params;

      try {
         const user = await userData.getUserById(id);
         return res.json({ ...user });
         
      } catch (e) {
         console.error(e);
         return renderErrorPage(res, 404, e.message);

         // TODO: `return next(e)` instead and create a catch-all 500 err handler as the last `app.use(...)`
      }
   }
);

export default router;