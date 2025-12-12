import { Router } from 'express';
import { renderErrorPage } from '../utils/errorUtils.js';

const router = Router();

router.get('/', (req, res) => {
    try {
        req.session.destroy();
        return res.redirect('/');
    } catch (error) {
        return renderErrorPage(res, 500, error);
    }
});

router.post("/", async (req, res) => {
    try {
        return res.redirect('/');
    } catch (error) {
        return renderErrorPage(res, 500, error);
    }
});

export default router;