import express from "express";

import {
    createUserByAdmin,
    getAllUsers,
    toggleUserStatus
} from "../controllers/adminUserController.js";

import requireAuth from "../middleware/authMiddleware.js";
import requireRole from "../middleware/roleMiddleware.js";

const router = express.Router();

router.use(requireAuth);
router.use(requireRole("HQ_ADMIN", "HQ_COMMAND"));

router.post("/users", createUserByAdmin);
router.get("/users", getAllUsers);
router.patch("/users/:id/status", toggleUserStatus);

export default router;