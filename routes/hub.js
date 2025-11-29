import { Router } from "express";
const router = Router();

router.get("/", async (req, res) => {
    return res.render("hub", { title: "Project Navigation Hub" });
});

export default router;