import { Router } from 'express';
import userFunctions from "../data/users.js";
import { renderErrorPage } from '../utils/errorUtils.js';

const router = Router();

router.get('/', (req, res) => {
    return res.render('signup', {
        title: "Create Account",
        error: null
    });
});

router.post("/", async (req, res) => {
    const { email, username, password, zipcode, role } = req.body;
    
    try {
        const validUserData = {
            email: email.toLowerCase(),
            password: password,
            role: role || userFunctions.server.roles.USER,
            zipcode: zipcode,
            profile: {
                username: username,
                firstName: null,
                lastName: null,
                dob: null,
                profilePicture: null,
                bio: null
            },
            settings: {
                dmsEnabled: true
            }
        };

        await userFunctions.createUser(validUserData);
        return res.redirect("/");

    } catch (error) {
        if (error.message.includes("duplicate") || error.code === 11000) {
            return res.status(409).render("signup", {
                error: "A user with that email or username already exists.",
                title: "Sign Up",
                error: "A user with that email or username already exists."
            });
        }
        
        return renderErrorPage(res, 500, "Error creating account. Please try again later.");
    }
});

export default router;