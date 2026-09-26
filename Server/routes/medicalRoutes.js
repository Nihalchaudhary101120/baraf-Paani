import express from "express";

import {
    getAllMedicalAssessments,
    getMedicalOverviewStats,
    getPersonnelMedicalRoster,
    getNominatedCandidates,
    getPersonnelMedicalHistory,
    createMedicalAssessment,
    getMedicalAssessment,
    updateMedicalAssessment,
    updateClearance
} from "../controllers/medicalController.js";

import requireAuth from "../middleware/authMiddleware.js";
import requireRole from "../middleware/roleMiddleware.js";

const router = express.Router();

router.use(requireAuth);

// Overview metrics & operational alerts
router.get(
    "/overview",
    requireRole("MEDICAL_OFFICER", "HQ_ADMIN", "HQ_COMMAND", "STATION_COMMANDER"),
    getMedicalOverviewStats
);

// Combined personnel medical roster (nominees only for the expedition)
router.get(
    "/roster",
    requireRole("MEDICAL_OFFICER", "HQ_ADMIN", "HQ_COMMAND", "STATION_COMMANDER"),
    getPersonnelMedicalRoster
);

// Nominated candidates list for Medical Officer dropdown
router.get(
    "/nominated-candidates",
    requireRole("MEDICAL_OFFICER", "HQ_ADMIN", "HQ_COMMAND"),
    getNominatedCandidates
);

// Historical assessments for a personnel across expeditions
router.get(
    "/history/:personnelId",
    requireRole("MEDICAL_OFFICER", "HQ_ADMIN", "HQ_COMMAND", "STATION_COMMANDER"),
    getPersonnelMedicalHistory
);

// List all assessments (with filters & search)
router.get(
    "/",
    requireRole("MEDICAL_OFFICER", "HQ_ADMIN", "HQ_COMMAND", "STATION_COMMANDER"),
    getAllMedicalAssessments
);

// Create medical assessment
router.post(
    "/",
    requireRole("MEDICAL_OFFICER", "HQ_ADMIN"),
    createMedicalAssessment
);

// Get medical assessment by ID
router.get(
    "/:id",
    requireRole("MEDICAL_OFFICER", "HQ_ADMIN", "HQ_COMMAND", "STATION_COMMANDER"),
    getMedicalAssessment
);

// Update medical assessment
router.put(
    "/:id",
    requireRole("MEDICAL_OFFICER", "HQ_ADMIN"),
    updateMedicalAssessment
);

// Update medical clearance decision
router.patch(
    "/:id/clearance",
    requireRole("MEDICAL_OFFICER", "HQ_ADMIN"),
    updateClearance
);

export default router;