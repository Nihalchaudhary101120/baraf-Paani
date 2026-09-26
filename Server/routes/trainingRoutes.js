import express from "express";

import {
    getAllTrainingClearances,
    getCandidateTrainingClearance,
    assignRequiredTraining,
    createTrainingClearance,
    getTrainingClearance,
    addTrainingRecord,
    updateTrainingRecord,
    deleteTrainingRecord,
    verifyAndCompleteTraining,
    completeTrainingClearance
} from "../controllers/trainingController.js";

import requireAuth from "../middleware/authMiddleware.js";
import requireRole from "../middleware/roleMiddleware.js";

const router = express.Router();

router.get(
    "/",
    requireAuth,
    requireRole("MEDICAL_OFFICER", "STATION_COMMANDER", "HQ_COMMAND", "HQ_ADMIN"),
    getAllTrainingClearances
);

router.get(
    "/candidate/:expeditionId/:personnelId",
    requireAuth,
    requireRole("MEDICAL_OFFICER", "STATION_COMMANDER", "HQ_COMMAND", "HQ_ADMIN"),
    getCandidateTrainingClearance
);

router.post(
    "/assign",
    requireAuth,
    requireRole("HQ_COMMAND", "HQ_ADMIN", "STATION_COMMANDER"),
    assignRequiredTraining
);

router.post(
    "/",
    requireAuth,
    requireRole("MEDICAL_OFFICER", "STATION_COMMANDER", "HQ_COMMAND", "HQ_ADMIN"),
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
    requireRole("MEDICAL_OFFICER", "STATION_COMMANDER", "HQ_COMMAND", "HQ_ADMIN"),
    addTrainingRecord
);

router.patch(
    "/:id/records/:index",
    requireAuth,
    requireRole("MEDICAL_OFFICER", "STATION_COMMANDER", "HQ_COMMAND", "HQ_ADMIN"),
    updateTrainingRecord
);

router.delete(
    "/:id/records/:index",
    requireAuth,
    requireRole("MEDICAL_OFFICER", "STATION_COMMANDER", "HQ_COMMAND", "HQ_ADMIN"),
    deleteTrainingRecord
);

router.patch(
    "/:id/verify",
    requireAuth,
    requireRole("HQ_COMMAND", "HQ_ADMIN", "STATION_COMMANDER"),
    verifyAndCompleteTraining
);

router.patch(
    "/:id/complete",
    requireAuth,
    requireRole("MEDICAL_OFFICER", "STATION_COMMANDER", "HQ_COMMAND", "HQ_ADMIN"),
    completeTrainingClearance
);

export default router;