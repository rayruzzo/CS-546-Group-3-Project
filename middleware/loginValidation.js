import * as yup from 'yup';
import bcrypt from "bcrypt";
import db from "../config/mongoCollections.js";
import { passwordSchema } from "../models/users.js";

export const loginSchema = yup.object().shape({
    email: yup.string().required().email(),
    password: passwordSchema
});

export const validateLogin = async (req, res, next) => {
    const { email, password } = req.body;

    try {
        await loginSchema.validate({ email, password }, { abortEarly: false });
    } catch (validationError) {
        return res.status(400).render("login", {
            error: "Invalid email or password format.",
            title: "Login"
        });
    }

    const userCollection = await db.users();
    const user = await userCollection.findOne({ email: email.toLowerCase() });

    if (!user) {
        return res.status(400).render("login", {
            error: "Incorrect email or password.",
            title: "Login"
        });
    }

    if (user.isBanned) {
        return res.status(403).render("login", {
            error: "Your account has been banned.",
            title: "Login"
        });
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
        return res.status(400).render("login", {
            error: "Incorrect email or password.",
            title: "Login"
        });
    }

    req.session.user = {
        _id: user._id.toString(),
        email: user.email,
        zipcode: user.zipcode,
        role: user.role,
        username: user.profile?.username || ""
    };
    
    next();
};