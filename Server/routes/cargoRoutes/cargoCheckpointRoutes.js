import express from "express";

import {
    createCheckpoint,
    getManifestCheckpoints,
    getItemTracking,
    getLatestCheckpoint,
    syncOfflineCheckpoints
} from "../controllers/cargoCheckpointController.js";

import requireAuth from "../middleware/requireAuth.js";

const router = express.Router();

router.post(
    "/",
    requireAuth,
    createCheckpoint
);

router.post(
    "/sync",
    requireAuth,
    syncOfflineCheckpoints
);

router.get(
    "/manifest/:manifestId",
    requireAuth,
    getManifestCheckpoints
);

router.get(
    "/track/:manifestId/:itemCode",
    requireAuth,
    getItemTracking
);

router.get(
    "/latest/:manifestId/:itemCode",
    requireAuth,
    getLatestCheckpoint
);

export default router;