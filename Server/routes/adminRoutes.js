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
    assignPersonnelToExpedition,
    getAdminMedicalRecords,
    getAdminCargoData,
    getAdminFieldOpsData,
    getAdminInventoryStatus
} from "../controllers/adminOperationsController.js";

import requireAuth from "../middleware/authMiddleware.js";
import requireRole from "../middleware/roleMiddleware.js";

const router = express.Router();

router.use(requireAuth);
router.use(requireRole("HQ_ADMIN", "HQ_COMMAND"));

// User Management
router.post("/users", createUserByAdmin);
router.get("/users", getAllUsers);
router.patch("/users/:id/status", toggleUserStatus);

// System & Admin Overview
router.get("/stats", getAdminStats);

// Device Registry (HQ_ADMIN)
router.get("/devices", getAllDevices);
router.post("/devices", registerDevice);
router.patch("/devices/:id/status", toggleDeviceStatus);

// Command Center (HQ_COMMAND & HQ_ADMIN)
router.get("/command-overview", getCommandOverview);
router.get("/personnel-readiness", getPersonnelReadiness);

// Expedition Management — full CRUD for HQ_ADMIN
router.get("/expeditions", getAllExpeditions);
router.post("/expeditions", createExpedition);
router.patch("/expeditions/:id", updateExpedition);
router.post("/expeditions/:id/assign-personnel", assignPersonnelToExpedition);

// HQ_ADMIN Read-only operational views
router.get("/medical-records", getAdminMedicalRecords);
router.get("/cargo-data", getAdminCargoData);
router.get("/field-ops", getAdminFieldOpsData);
router.get("/inventory-status", getAdminInventoryStatus);

export default router;