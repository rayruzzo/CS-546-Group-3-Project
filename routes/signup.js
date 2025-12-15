import { Router } from 'express';
import userFunctions from "../data/users.js";
import { renderErrorPage } from '../utils/errorUtils.js';
import { SCHEMA_CONFIG, userSchema } from '../models/users.js';
import { validateSchema } from '../middleware/validation.mw.js';
import { shapeUserData } from '../middleware/shapeUser.mw.js';

const router = Router();

router.get('/', (req, res) => {
    return res.render('signup', {
        title: "Create Account",
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
        },
        error: null
    });
});


router.post("/", 
shapeUserData,
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