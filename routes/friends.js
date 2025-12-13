import { Router } from "express";
import { validateSchema } from "../middleware/validation.mw.js";
import { renderErrorPage } from "../utils/errorUtils.js";
import { usernameParamSchema } from "../models/users.js";
import userData from "../data/users.js";
import friendData from "../data/friends.js";

const router = Router();

router.post("/add/:username",
	validateSchema(usernameParamSchema, "params"),
	async (req, res) => {
		try {
			const { user } = await userData.getUserByUsername(req.params.username);

			const result = await friendData.addFriend(
				req.session?.user._id.toString(),
				user._id.toString()
			);

			return res.json(result);

		} catch (error) {
			console.error(error);
			return renderErrorPage(res, 404, "Cannot friend a user that does not exist");
		}
	}
);

router.post("/remove/:username",
	validateSchema(usernameParamSchema, "params"),
	async (req, res) => {
		try {
			const { user } = await userData.getUserByUsername(req.params.username);

			const result = await friendData.removeFriend(
				req.session?.user._id.toString(),
				user._id.toString()
			);

			return res.json(result);

		} catch (error) {
			console.error(error);
			return renderErrorPage(res, 404, "Cannot unfriend a user that does not exist");
		}
	}
);

export default router;
