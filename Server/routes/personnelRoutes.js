import express from "express";
import { getMyProfile, updateMyProfile } from "../controllers/personnelController.js";
import requireAuth from "../middleware/authMiddleware.js";
import requireRole from "../middleware/roleMiddleware.js";

const router = express.Router();

const personnelRoles = [
    "SCIENTIST",
    "STATION_OPERATOR",
    "INVENTORY_MANAGER",
    "MEDICAL_OFFICER",
    "STATION_COMMANDER",
    "LOGISTICS_OFFICER",
    "SHIP_OFFICER",
    "FLIGHT_OFFICER"
];

// GET  /personnel/me  — fetch own personnel profile
router.get("/me", requireAuth, requireRole(...personnelRoles), getMyProfile);

// PUT  /personnel/me  — update / complete own personnel profile
router.put("/me", requireAuth, requireRole(...personnelRoles), updateMyProfile);

export default router;