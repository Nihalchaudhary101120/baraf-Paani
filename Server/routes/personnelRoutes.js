import express from "express";
import { updateMyProfile } from "../controllers/personnelController.js";
import requireAuth from "../middleware/authMiddleware.js";
import requireRole from "../middleware/roleMiddleware.js";

const router = express.Router();

router.put(
    "/me",
    requireAuth,
    requireRole(
        "SCIENTIST",
        "STATION_OPERATOR",
        "INVENTORY_MANAGER",
        "MEDICAL_OFFICER"
    ),
    updateMyProfile
);

export default router;