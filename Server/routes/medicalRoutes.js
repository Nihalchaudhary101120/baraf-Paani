import express from "express";

import {
    createMedicalAssessment,
    getMedicalAssessment,
    updateMedicalAssessment,
    updateClearance
} from "../controllers/medicalController.js";

import requireAuth from "../middleware/requireAuth.js";
import requireRole from "../middleware/requireRole.js";

const router = express.Router();

// Create medical assessment
router.post(
    "/",
    requireAuth,
    requireRole("MEDICAL_OFFICER"),
    createMedicalAssessment
);

// Get medical assessment
router.get(
    "/:id",
    requireAuth,
    requireRole("MEDICAL_OFFICER"),
    getMedicalAssessment
);

// Update medical assessment
router.put(
    "/:id",
    requireAuth,
    requireRole("MEDICAL_OFFICER"),
    updateMedicalAssessment
);

// Update medical clearance
router.patch(
    "/:id/clearance",
    requireAuth,
    requireRole("MEDICAL_OFFICER"),
    updateClearance
);

export default router;