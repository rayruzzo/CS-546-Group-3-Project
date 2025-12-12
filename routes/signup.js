import { Router } from 'express';
import userFunctions from "../data/users.js";
import { renderErrorPage } from '../utils/errorUtils.js';
import { userSchema } from '../models/users.js';
import { validateSchema } from '../middleware/validation.mw.js';

const router = Router();

router.get('/', (req, res) => {
    return res.render('signup', {
        title: "Create Account",
        error: null
    });
});


router.post("/", 
// <——— new data shaping middleware here before validation
validateSchema(userSchema, "body"),
async (req, res) => {
    try {
        const {user} = await userFunctions.createUser(req.body);
        req.session.user = {
            _id: user._id.toString(),
            email: user.email,
            zipcode: user.zipcode,
            role: user.role,
            username: user.profile?.username || ""
        };
        return res.redirect("/");

    } catch (error) {
        return renderErrorPage(res, 500, "Error creating account. Please try again later.");
    }
});

export default router;