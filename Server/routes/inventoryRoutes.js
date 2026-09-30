import express from "express";
import requireAuth from "../middleware/authMiddleware.js";
import requireRole from "../middleware/roleMiddleware.js";
import {
  getStationInventory,
  getStationInventorySummary,
  getItemBatches,
  consumeStock,
  getAllStationsInventory,
  getTransactionHistory,
  manualReceiveCargo
} from "../controllers/inventoryController.js";

const router = express.Router();

// All inventory routes require authentication
router.use(requireAuth);

// ── HQ / Multi-Station Routes ────────────────────────────────────────────────

/**
 * GET /api/inventory/stations
 * HQ overview of all stations' inventory.
 * Roles: HQ_COMMAND, HQ_ADMIN
 */
router.get(
  "/stations",
  requireRole("HQ_COMMAND", "HQ_ADMIN", "LOGISTICS_OFFICER"),
  getAllStationsInventory
);

// ── Station-Specific Routes ──────────────────────────────────────────────────

/**
 * GET /api/inventory/:stationId/summary
 * Summary cards for a station.
 */
router.get(
  "/:stationId/summary",
  requireRole(
    "INVENTORY_MANAGER",
    "STATION_COMMANDER",
    "STATION_OPERATOR",
    "HQ_COMMAND",
    "HQ_ADMIN",
    "LOGISTICS_OFFICER"
  ),
  getStationInventorySummary
);

/**
 * GET /api/inventory/:stationId/transactions
 * Transaction history for a station.
 */
router.get(
  "/:stationId/transactions",
  requireRole(
    "INVENTORY_MANAGER",
    "STATION_COMMANDER",
    "HQ_COMMAND",
    "HQ_ADMIN",
    "LOGISTICS_OFFICER"
  ),
  getTransactionHistory
);

/**
 * POST /api/inventory/:stationId/consume
 * FCFS stock consumption — INVENTORY_MANAGER only.
 */
router.post(
  "/:stationId/consume",
  requireRole("INVENTORY_MANAGER", "STATION_COMMANDER", "STATION_OPERATOR"),
  consumeStock
);

/**
 * POST /api/inventory/:stationId/receive
 * Manual receipt trigger — if auto-receipt was missed.
 */
router.post(
  "/:stationId/receive",
  requireRole("INVENTORY_MANAGER", "HQ_ADMIN", "LOGISTICS_OFFICER"),
  manualReceiveCargo
);

/**
 * GET /api/inventory/:stationId/:skuId/batches
 * Batch details for a specific SKU at a station (FCFS order).
 */
router.get(
  "/:stationId/:skuId/batches",
  requireRole(
    "INVENTORY_MANAGER",
    "STATION_COMMANDER",
    "STATION_OPERATOR",
    "HQ_COMMAND",
    "HQ_ADMIN"
  ),
  getItemBatches
);

/**
 * GET /api/inventory/:stationId
 * Aggregated inventory list for a station.
 */
router.get(
  "/:stationId",
  requireRole(
    "INVENTORY_MANAGER",
    "STATION_COMMANDER",
    "STATION_OPERATOR",
    "HQ_COMMAND",
    "HQ_ADMIN",
    "LOGISTICS_OFFICER"
  ),
  getStationInventory
);

export default router;
