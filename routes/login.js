import { Router } from 'express';
import { validateLogin } from "../middleware/loginValidation.js";


const router = Router();

router.get('/', (req, res) => {
    return res.render('login', {
        title: "Login",
        error: null
    });
});

router.post("/", validateLogin, async (req, res) => {
    return res.redirect("/");
});

export default router;