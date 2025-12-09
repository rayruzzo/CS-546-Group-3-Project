import {Router} from 'express';
import bcrypt from "bcrypt";
import db from "../config/mongoCollections.js";
import { signupSchema } from "../middleware/signupValidation.js";

const {users} = db;
const router = Router();


router.get('/', (req, res) => {
    return res.render('signup/signup', {
        title: "Create Account"
    });
});



router.post("/", async (req, res) => {
    // 1. Destructure all fields, including the hidden 'role'
    const { email, username, password, confirmpassword, zipcode, role } = req.body;
    
    // Default error view for rendering
    const errorView = "signup/signup"; // Assuming your sign-up view is 'signup/signup'
    const viewTitle = "Sign Up";
    const userCollection = await users();

    // 2. Yup Validation
    try {
        await signupSchema.validate(
            { email, username, password, confirmpassword, zipcode, role },
            { abortEarly: false }
        );
    } catch (validationError) {
        // Collect all validation errors
        const errors = validationError.errors;
        
        return res.status(400).render(errorView, {
            error: errors.join(" "), // Display all errors concatenated
            title: viewTitle,
            // Re-populate fields (excluding password for security)
            email, username, zipcode
        });
    }

    // 3. Check for Existing User
    try {
        const existingUser = await userCollection.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(409).render(errorView, { // 409 Conflict
                error: "A user with that email address already exists.",
                title: viewTitle,
                email, username, zipcode
            });
        }
    } catch (e) {
        return res.status(500).render(errorView, {
            error: "Server error during user check.",
            title: viewTitle
        });
    }

    // 4. Hash the Password
    let hashedPassword;
    try {
        const saltRounds = 10;
        hashedPassword = await bcrypt.hash(password, saltRounds);
    } catch (e) {
        return res.status(500).render(errorView, {
            error: "Error processing password.",
            title: viewTitle
        });
    }

    // 5. Insert New User
    let newUserId;
    try {
        const newUser = {
            email: email.toLowerCase(),
            password: hashedPassword,
            role: role || "user", // Default to 'user' if somehow missing (though schema checks it)
            zipcode: zipcode,
            profile: { 
                username: username 
            },
            isBanned: false // Default state
        };
        
        const insertInfo = await userCollection.insertOne(newUser);
        if (insertInfo.insertedCount === 0) throw new Error("Could not add user.");

        newUserId = insertInfo.insertedId.toString();
    } catch (e) {
        return res.status(500).render(errorView, {
            error: "Error creating user account.",
            title: viewTitle
        });
    }

    // 6. Redirection
    return res.redirect("/login?signup_success=true");// Redirect to the homepage or a welcome page
});
export default router;