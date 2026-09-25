import express from "express";
import { getStations, createStation } from "../controllers/stationController.js";
import requireAuth from "../middleware/authMiddleware.js";
import requireRole from "../middleware/roleMiddleware.js";

const router = express.Router();

router.get("/", getStations);
router.post("/", requireAuth, requireRole("HQ_ADMIN", "HQ_COMMAND"), createStation);

export default router;
