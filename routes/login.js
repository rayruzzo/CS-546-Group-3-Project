import {Router} from 'express';
const router = Router();

router.get('/', (req, res) => {
    return res.render('login/login', {
        title: "Login"
    });
});

export default router;