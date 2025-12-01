import {Router} from 'express';
import bcrypt from "bcrypt";
import db from "../config/mongoCollections.js";
import { loginSchema } from "../middleware/loginValidation.js";

const {users} = db;
const router = Router();

router.get('/', (req, res) => {
    return res.render('login/login', {
        title: "Login"
    });
});

/*****************************************************************************
 * POST /login
 * Body Parameters:
 *    - email: string
 *    - password: string
 *
 * Description:
 *    Validates login input, checks user existence,
 *    verifies password with bcrypt, checks ban status,
 *    and creates a session for authenticated users.
 *
 * Logic Flow:
 *    1. Validate email + password (Yup)
 *    2. Lookup user by email in MongoDB
 *    3. If no user -> return "Incorrect email or password"
 *    4. If banned -> return "Your account has been banned"
 *    5. Compare submitted password with stored bcrypt hash
 *    6. If match -> set req.session.user
 *    7. Redirect to homepage
 *
 * Returns:
 *    - 200: Redirect to "/"
 *    - 400: Incorrect email or password
 *    - 403: Banned account
 *****************************************************************************/

router.post("/", async (req, res) => {
    const {email, password} = req.body;

    // Yup Validation
    try {
        await loginSchema.validate(
            {email, password},
            {abortEarly: false}
        );
    } catch (validationError) {
        return res.status(400).render("login/login", {
            error: "Invalid email or password format.",
            title: "Login"
        });
    }

    // User DB Lookup
    const userCollection = await users();
    const user = await userCollection.findOne({email: email.toLowerCase()});

    if (!user) {
        return res.status(400).render("login/login", {
            error: "Incorrect email or password.",
            title: "Login"
        });
    }

    // Check if Banned
    if (user.isBanned) {
        return res.status(403).render("login/login", {
            error: "Your account has been banned.",
            title: "Login"
        });
    }

    // Check Password
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
        return res.status(400).render("login/login", {
            error: "Incorrect email or password.",
            title: "Login"
        });
    }

    // Create Session
    req.session.user = {
        _id: user._id.toString(),
        email: user.email,
        zipcode: user.zipcode,
        role: user.role,
        username: user.profile?.username || ""
    };

    //Redirection
    return res.redirect("/");
});


/*****************************************************************************
 * TEMPORARILY CREATE USER: http://localhost:3000/login/createTestUser
 ****************************************************************************/
router.get("/createTestUser", async (req, res) => {
    const userCollection = await users();
    const hashed = await bcrypt.hash("password123", 10);

    await userCollection.insertOne({
        email: "test@example.com",
        password: hashed,
        role: "user",
        zipcode: "07030",
        profile: { username: "TestUser" },
        settings: {},
        isBanned: false
    });

    res.send("Test user created.");
});

export default router;