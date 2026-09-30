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

import {
    generateManifestQRs,
    generateSingleItemQR,
    getScanCargoInfo
} from "../../controllers/cargo/cargoQrController.js";

import requireAuth from "../../middleware/authMiddleware.js";
import requireRole from "../../middleware/roleMiddleware.js";

const router = express.Router();

// Public / Officer Cargo Scan Lookup Endpoint
router.get(
    "/scan/:trackingCode",
    getScanCargoInfo
);

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

// ── Bulk & Single Item QR Generation ──────────────────────────────────────────
router.post(
    "/:manifestId/generate-qr",
    requireAuth,
    requireRole("HQ_ADMIN", "LOGISTICS_OFFICER", "HQ_COMMAND", "CARGO_OFFICER"),
    generateManifestQRs
);

router.post(
    "/:manifestId/items/:itemCode/qr",
    requireAuth,
    requireRole("HQ_ADMIN", "LOGISTICS_OFFICER", "HQ_COMMAND", "CARGO_OFFICER"),
    generateSingleItemQR
);

// Legacy patch endpoint wrapper
router.patch(
    "/:manifestId/items/:itemCode/qr",
    requireAuth,
    requireRole("HQ_ADMIN", "LOGISTICS_OFFICER", "HQ_COMMAND", "CARGO_OFFICER"),
    generateSingleItemQR
);

export default router;