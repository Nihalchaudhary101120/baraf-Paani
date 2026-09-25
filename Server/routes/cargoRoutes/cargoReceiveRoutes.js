import express from "express";

import requireAuth from "../middleware/requireAuth.js";
import requireRole from "../middleware/requireRole.js";

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