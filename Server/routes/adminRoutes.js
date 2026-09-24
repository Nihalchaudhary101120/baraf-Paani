import express from "express";

import {
    createUserByAdmin
} from "../controllers/adminUserController.js";

import requireAuth from "../middleware/requireAuth.js";
import requireRole from "../middleware/requireRole.js";

const router = express.Router();

router.post(
    "/users",
    requireAuth,
    requireRole("HQ_COMMAND"),
    createUserByAdmin
);

export default router;