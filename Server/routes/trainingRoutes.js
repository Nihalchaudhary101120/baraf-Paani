import express from "express";

import {
    createTrainingClearance,
    getTrainingClearance,
    addTrainingRecord,
    updateTrainingRecord,
    deleteTrainingRecord,
    completeTrainingClearance
} from "../controllers/trainingController.js";

import requireAuth from "../middleware/requireAuth.js";
import requireRole from "../middleware/requireRole.js";

const router = express.Router();

router.post(
    "/",
    requireAuth,
    requireRole("MEDICAL_OFFICER", "STATION_COMMANDER", "HQ_ADMIN"),
    createTrainingClearance
);

router.get(
    "/:id",
    requireAuth,
    requireRole(
        "MEDICAL_OFFICER",
        "STATION_COMMANDER",
        "HQ_COMMAND",
        "HQ_ADMIN"
    ),
    getTrainingClearance
);

router.post(
    "/:id/records",
    requireAuth,
    requireRole("MEDICAL_OFFICER", "STATION_COMMANDER", "HQ_ADMIN"),
    addTrainingRecord
);

router.patch(
    "/:id/records/:index",
    requireAuth,
    requireRole("MEDICAL_OFFICER", "STATION_COMMANDER", "HQ_ADMIN"),
    updateTrainingRecord
);

router.delete(
    "/:id/records/:index",
    requireAuth,
    requireRole("MEDICAL_OFFICER", "STATION_COMMANDER", "HQ_ADMIN"),
    deleteTrainingRecord
);

router.patch(
    "/:id/complete",
    requireAuth,
    requireRole("MEDICAL_OFFICER", "STATION_COMMANDER", "HQ_ADMIN"),
    completeTrainingClearance
);

export default router;