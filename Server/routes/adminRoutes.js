import express from "express";

import {
    createUserByAdmin,
    getAllUsers,
    toggleUserStatus
} from "../controllers/adminUserController.js";

import {
    getAdminStats,
    getAllDevices,
    registerDevice,
    toggleDeviceStatus,
    getCommandOverview,
    getPersonnelReadiness,
    getAllExpeditions,
    createExpedition,
    updateExpedition,
    nominatePersonnelToExpedition,
    assignPersonnelToExpedition,
    getExpeditionCandidates,
    confirmExpeditionCandidate,
    removeExpeditionCandidate,
    getAdminMedicalRecords,
    getAdminCargoData,
    getAdminFieldOpsData,
    getAdminInventoryStatus
} from "../controllers/adminOperationsController.js";

import requireAuth from "../middleware/authMiddleware.js";
import requireRole from "../middleware/roleMiddleware.js";

const router = express.Router();

router.use(requireAuth);

// User Management — Read allowed for HQ, Medical, Commanders, Logistics; Write strictly HQ_ADMIN
router.get("/users", requireRole("HQ_ADMIN", "HQ_COMMAND", "MEDICAL_OFFICER", "STATION_COMMANDER", "LOGISTICS_OFFICER"), getAllUsers);
router.post("/users", requireRole("HQ_ADMIN"), createUserByAdmin);
router.patch("/users/:id/status", requireRole("HQ_ADMIN"), toggleUserStatus);

// System & Admin Overview
router.get("/stats", requireRole("HQ_ADMIN", "HQ_COMMAND"), getAdminStats);

// Device Registry
router.get("/devices", requireRole("HQ_ADMIN", "HQ_COMMAND", "STATION_COMMANDER"), getAllDevices);
router.post("/devices", requireRole("HQ_ADMIN"), registerDevice);
router.patch("/devices/:id/status", requireRole("HQ_ADMIN"), toggleDeviceStatus);

// Command Center & Personnel Readiness
router.get("/command-overview", requireRole("HQ_COMMAND", "HQ_ADMIN", "STATION_COMMANDER"), getCommandOverview);
router.get("/personnel-readiness", requireRole("HQ_COMMAND", "HQ_ADMIN", "STATION_COMMANDER", "MEDICAL_OFFICER"), getPersonnelReadiness);

// Expedition Management & Candidate Lifecycle — Read allowed for operational roles; Write HQ_ADMIN & HQ_COMMAND
router.get("/expeditions", requireRole("HQ_ADMIN", "HQ_COMMAND", "MEDICAL_OFFICER", "STATION_COMMANDER", "LOGISTICS_OFFICER"), getAllExpeditions);
router.post("/expeditions", requireRole("HQ_ADMIN", "HQ_COMMAND"), createExpedition);
router.patch("/expeditions/:id", requireRole("HQ_ADMIN", "HQ_COMMAND"), updateExpedition);
router.post("/expeditions/:id/assign-personnel", requireRole("HQ_ADMIN", "HQ_COMMAND"), assignPersonnelToExpedition);
router.post("/expeditions/:id/nominate-personnel", requireRole("HQ_ADMIN", "HQ_COMMAND"), nominatePersonnelToExpedition);
router.get("/expeditions/:id/candidates", requireRole("HQ_ADMIN", "HQ_COMMAND", "MEDICAL_OFFICER", "STATION_COMMANDER", "LOGISTICS_OFFICER"), getExpeditionCandidates);
router.post("/expeditions/:id/confirm-candidate/:candidateId", requireRole("HQ_ADMIN", "HQ_COMMAND"), confirmExpeditionCandidate);
router.delete("/expeditions/:id/candidates/:candidateId", requireRole("HQ_ADMIN", "HQ_COMMAND"), removeExpeditionCandidate);

// Operational views
router.get("/medical-records", requireRole("HQ_ADMIN", "HQ_COMMAND", "MEDICAL_OFFICER"), getAdminMedicalRecords);
router.get("/cargo-data", requireRole("HQ_ADMIN", "HQ_COMMAND", "LOGISTICS_OFFICER"), getAdminCargoData);
router.get("/field-ops", requireRole("HQ_ADMIN", "HQ_COMMAND", "STATION_COMMANDER"), getAdminFieldOpsData);
router.get("/inventory-status", requireRole("HQ_ADMIN", "HQ_COMMAND", "INVENTORY_MANAGER", "LOGISTICS_OFFICER"), getAdminInventoryStatus);

export default router;