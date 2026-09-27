import express from "express";

import {
    createManifest,
    getManifest,
    getManifests,
    updateManifest,
    updateManifestStatus,
    addManifestItem,
    updateManifestItemQR
} from "../../controllers/cargo/cargoMenifestController.js";

import requireAuth from "../../middleware/authMiddleware.js";
import requireRole from "../../middleware/roleMiddleware.js";

const router = express.Router();

router.post(
    "/",
    requireAuth,
    requireRole("HQ_ADMIN", "LOGISTICS_OFFICER", "HQ_COMMAND", "CARGO_OFFICER"),
    createManifest
);

router.get(
    "/",
    requireAuth,
    getManifests
);

router.get(
    "/:id",
    requireAuth,
    getManifest
);

router.put(
    "/:id",
    requireAuth,
    requireRole("HQ_ADMIN", "LOGISTICS_OFFICER", "HQ_COMMAND", "CARGO_OFFICER"),
    updateManifest
);

router.patch(
    "/:id/status",
    requireAuth,
    requireRole("HQ_ADMIN", "LOGISTICS_OFFICER", "HQ_COMMAND", "CARGO_OFFICER"),
    updateManifestStatus
);

// ── Box / Item routes ────────────────────────────────────────────────────────
router.post(
    "/:id/items",
    requireAuth,
    requireRole("HQ_ADMIN", "LOGISTICS_OFFICER", "HQ_COMMAND", "CARGO_OFFICER"),
    addManifestItem
);

router.patch(
    "/:id/items/:itemCode/qr",
    requireAuth,
    requireRole("HQ_ADMIN", "LOGISTICS_OFFICER", "HQ_COMMAND", "CARGO_OFFICER"),
    updateManifestItemQR
);

export default router;