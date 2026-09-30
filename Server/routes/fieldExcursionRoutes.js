import express from "express";
import {
    createFieldExcursion,
    getActiveExcursions,
    getExcursionHistory,
    getMyActiveExcursions,
    getExcursionById,
    startExcursion,
    markExcursionReturned,
    cancelExcursion,
    submitFieldCheckIn,
    getExcursionCheckIns,
    getLatestCheckIns
} from "../controllers/fieldExcursionController.js";
import requireAuth from "../middleware/authMiddleware.js";
import requireRole from "../middleware/roleMiddleware.js";

const router = express.Router();

const OPERATOR_ROLES = [
    "STATION_OPERATOR",
    "STATION_COMMANDER",
    "HQ_COMMAND",
    "HQ_ADMIN"
];

// ── Excursion Lists & Filters ─────────────────────────────────────────
router.get("/active", requireAuth, getActiveExcursions);
router.get("/history", requireAuth, getExcursionHistory);
router.get("/my-active", requireAuth, getMyActiveExcursions);
router.get("/", requireAuth, getActiveExcursions);

// ── Create Excursion (Station Operator) ───────────────────────────────
router.post("/", requireAuth, requireRole(...OPERATOR_ROLES), createFieldExcursion);

// ── Excursion Details ─────────────────────────────────────────────────
router.get("/:id", requireAuth, getExcursionById);

// ── Lifecycle Transitions ────────────────────────────────────────────
router.post("/:id/start", requireAuth, requireRole(...OPERATOR_ROLES), startExcursion);
router.post("/:id/return", requireAuth, requireRole(...OPERATOR_ROLES), markExcursionReturned);
router.post("/:id/cancel", requireAuth, requireRole(...OPERATOR_ROLES), cancelExcursion);

// ── Field Check-Ins ──────────────────────────────────────────────────
router.post("/:id/check-ins", requireAuth, submitFieldCheckIn);
router.get("/:id/check-ins", requireAuth, getExcursionCheckIns);
router.get("/:id/latest-check-ins", requireAuth, getLatestCheckIns);

export default router;
