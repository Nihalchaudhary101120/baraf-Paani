import express from "express";

import {
    createManifest,
    getManifest,
    getManifests,
    updateManifest,
    updateManifestStatus
} from "../controllers/cargoManifestController.js";

import requireAuth from "../middleware/requireAuth.js";
import requireRole from "../middleware/requireRole.js";

const router = express.Router();

router.post(
    "/",
    requireAuth,
    requireRole("LOGISTICS_OFFICER", "HQ_COMMAND"),
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
    requireRole("LOGISTICS_OFFICER", "HQ_COMMAND"),
    updateManifest
);

router.patch(
    "/:id/status",
    requireAuth,
    requireRole("LOGISTICS_OFFICER", "HQ_COMMAND"),
    updateManifestStatus
);

export default router;