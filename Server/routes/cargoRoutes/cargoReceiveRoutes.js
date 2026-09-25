import express from "express";

import requireAuth from "../../middleware/authMiddleware.js";
import requireRole from "../../middleware/roleMiddleware.js";

import { receiveCargo } from "../../controllers/cargo/cargoReceiveController.js";

const router = express.Router();

router.post(
  "/",
  requireAuth,
  requireRole(
    "STATION_OPERATOR",
    "STATION_COMMANDER",
    "INVENTORY_MANAGER"
  ),
  receiveCargo
);

export default router;