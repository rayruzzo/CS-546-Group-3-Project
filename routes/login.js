import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
    return res.render('login', {
        title: "Login",
        error: null
    });
});

router.post("/", async (req, res) => {
    return res.redirect("/");
});

export default router;