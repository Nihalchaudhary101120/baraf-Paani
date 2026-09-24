import express from "express";

import {
    createShipment,
    getShipment,
    getShipments,
    assignManifestToShipment,
    updateShipmentStatus
} from "../controllers/shipmentController.js";

import requireAuth from "../middleware/requireAuth.js";
import requireRole from "../middleware/requireRole.js";

const router = express.Router();

router.post(
    "/",
    requireAuth,
    requireRole("LOGISTICS_OFFICER", "HQ_COMMAND"),
    createShipment
);

router.get(
    "/",
    requireAuth,
    getShipments
);

router.get(
    "/:id",
    requireAuth,
    getShipment
);

router.post(
    "/:shipmentId/manifests/:manifestId",
    requireAuth,
    requireRole("LOGISTICS_OFFICER", "HQ_COMMAND"),
    assignManifestToShipment
);

router.patch(
    "/:id/status",
    requireAuth,
    requireRole(
        "LOGISTICS_OFFICER",
        "SHIP_OFFICER",
        "FLIGHT_OFFICER"
    ),
    updateShipmentStatus
);

export default router;