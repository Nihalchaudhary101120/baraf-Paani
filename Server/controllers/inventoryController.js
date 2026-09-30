import mongoose from "mongoose";
import crypto from "crypto";
import InventoryBatch from "../models/inventory-models/inventory-batch.js";
import InventoryItem from "../models/inventory-models/inventory-item.js";
import InventoryTransaction from "../models/inventory-models/inventory-transaction.js";
import Station from "../models/master-models/station.js";
import User from "../models/master-models/user.js";
import Personnel from "../models/master-models/personnel.js";
import processManifestDelivery from "../services/inventoryReceiptService.js";
import consumeInventoryFCFS from "../services/inventoryConsumptionService.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

const generateTransactionNumber = () =>
  `INV-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

const resolveStationId = async (input) => {
  if (!input) return null;
  if (mongoose.Types.ObjectId.isValid(input)) {
    const st = await Station.findById(input);
    if (st) return st._id;
  }
  const found = await Station.findOne({
    $or: [
      { code: String(input).toUpperCase() },
      { name: new RegExp(`^${input}`, "i") }
    ]
  });
  return found ? found._id : null;
};

/**
 * Validate that non-HQ users (such as Station Operator and Inventory Manager)
 * can ONLY access their assigned station.
 * Rejects unauthorized station access with 403 Forbidden.
 */
const validateStationAccess = async (req, targetStationId) => {
  if (["HQ_ADMIN", "HQ_COMMAND"].includes(req.user?.role)) {
    return { allowed: true };
  }

  let userStationId = req.user?.stationId;
  if (!userStationId) {
    const userDoc = await User.findById(req.user?.userId).select("stationId role");
    userStationId = userDoc?.stationId;
    if (!userStationId) {
      const p = await Personnel.findOne({ userId: req.user?.userId }).select("expedition.assignedStation");
      userStationId = p?.expedition?.assignedStation;
    }
  }

  if (!userStationId) {
    return {
      allowed: false,
      statusCode: 403,
      message: "Forbidden: No assigned station found for authenticated user."
    };
  }

  if (String(userStationId) !== String(targetStationId)) {
    return {
      allowed: false,
      statusCode: 403,
      message: "Forbidden: Unauthorized station access. You cannot access inventory for another station."
    };
  }

  return { allowed: true, stationId: userStationId };
};

/**
 * GET /api/inventory/:stationId
 *
 * Returns aggregated inventory for a station — one row per SKU.
 * Aggregates across all AVAILABLE + DEPLETED batches.
 * Supports: search (name/SKU), category filter, status filter, sort.
 */
export const getStationInventory = async (req, res) => {
  try {
    const { stationId } = req.params;
    const { search, category, status, sort = "itemName", order = "asc" } = req.query;

    const stId = await resolveStationId(stationId);
    if (!stId) {
      return res.status(400).json({ success: false, message: "Invalid station ID" });
    }

    // Station authorization validation
    const access = await validateStationAccess(req, stId);
    if (!access.allowed) {
      return res.status(access.statusCode || 403).json({
        success: false,
        message: access.message
      });
    }

    // Aggregate InventoryBatch by skuCode + stationId
    const pipeline = [
      { $match: { stationId: stId } },
      {
        $group: {
          _id: { skuCode: "$skuCode", stationId: "$stationId" },
          skuId: { $first: "$skuId" },
          skuCode: { $first: "$skuCode" },
          itemName: { $first: "$itemName" },
          category: { $first: "$category" },
          unit: { $first: "$unit" },
          totalReceived: { $sum: "$receivedQuantity" },
          totalRemaining: { $sum: { $cond: [{ $eq: ["$status", "AVAILABLE"] }, "$remainingQuantity", 0] } },
          batchCount: { $sum: { $cond: [{ $eq: ["$status", "AVAILABLE"] }, 1, 0] } },
          totalBatches: { $sum: 1 },
          latestReceivedAt: { $max: "$receivedAt" },
          earliestBatchAt: { $min: { $cond: [{ $eq: ["$status", "AVAILABLE"] }, "$receivedAt", null] } }
        }
      },
      {
        $lookup: {
          from: "inventoryitems",
          let: { stId: "$_id.stationId", scode: "$_id.skuCode" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$stationId", "$$stId"] },
                    { $eq: ["$itemCode", "$$scode"] }
                  ]
                }
              }
            }
          ],
          as: "itemDoc"
        }
      },
      {
        $lookup: {
          from: "skus",
          localField: "skuId",
          foreignField: "_id",
          as: "skuDoc"
        }
      },
      {
        $addFields: {
          minimumStock: {
            $ifNull: [
              { $arrayElemAt: ["$itemDoc.minimumStock", 0] },
              { $arrayElemAt: ["$skuDoc.reorderLevel", 0] },
              10
            ]
          },
          criticalStock: {
            $ifNull: [
              { $arrayElemAt: ["$itemDoc.criticalStock", 0] },
              { $arrayElemAt: ["$skuDoc.minStockLevel", 0] },
              5
            ]
          }
        }
      },
      {
        $addFields: {
          stockStatus: {
            $switch: {
              branches: [
                { case: { $lte: ["$totalRemaining", 0] }, then: "OUT_OF_STOCK" },
                { case: { $lte: ["$totalRemaining", "$criticalStock"] }, then: "CRITICAL" },
                { case: { $lte: ["$totalRemaining", "$minimumStock"] }, then: "LOW_STOCK" }
              ],
              default: "AVAILABLE"
            }
          }
        }
      }
    ];

    // Apply filters
    const postMatchConditions = {};
    if (search) {
      const regex = new RegExp(search, "i");
      postMatchConditions.$or = [
        { skuCode: regex },
        { itemName: regex }
      ];
    }
    if (category && category !== "ALL") {
      postMatchConditions.category = category.toUpperCase();
    }
    if (status && status !== "ALL") {
      postMatchConditions.stockStatus = status.toUpperCase();
    }
    if (Object.keys(postMatchConditions).length > 0) {
      pipeline.push({ $match: postMatchConditions });
    }

    // Sort
    const sortField = ["totalRemaining", "itemName", "latestReceivedAt"].includes(sort) ? sort : "itemName";
    pipeline.push({ $sort: { [sortField]: order === "desc" ? -1 : 1 } });

    const inventory = await InventoryBatch.aggregate(pipeline);

    return res.status(200).json({
      success: true,
      stationId,
      count: inventory.length,
      inventory
    });
  } catch (err) {
    console.error("[getStationInventory]", err);
    return res.status(500).json({ success: false, message: "Failed to fetch inventory" });
  }
};

/**
 * GET /api/inventory/:stationId/summary
 *
 * Summary cards for the dashboard.
 */
export const getStationInventorySummary = async (req, res) => {
  try {
    const { stationId } = req.params;
    const stId = await resolveStationId(stationId);
    if (!stId) {
      return res.status(400).json({ success: false, message: "Invalid station ID" });
    }

    // Station authorization validation
    const access = await validateStationAccess(req, stId);
    if (!access.allowed) {
      return res.status(access.statusCode || 403).json({
        success: false,
        message: access.message
      });
    }

    const [summaryAgg, recentReceipts, lowStockAgg, criticalAgg] = await Promise.all([
      // Total SKUs and stock
      InventoryBatch.aggregate([
        { $match: { stationId: stId, status: "AVAILABLE" } },
        {
          $group: {
            _id: "$skuCode",
            totalRemaining: { $sum: "$remainingQuantity" }
          }
        },
        {
          $group: {
            _id: null,
            totalSKUs: { $sum: 1 },
            totalStock: { $sum: "$totalRemaining" }
          }
        }
      ]),
      // Recent receipts (last 7 days)
      InventoryTransaction.countDocuments({
        stationId: stId,
        transactionType: "RECEIPT",
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      }),
      // Low stock SKUs: currentStock > criticalStock && currentStock <= minimumStock
      InventoryItem.aggregate([
        { $match: { stationId: stId } },
        {
          $match: {
            $expr: {
              $and: [
                { $gt: ["$currentStock", "$criticalStock"] },
                { $lte: ["$currentStock", "$minimumStock"] }
              ]
            }
          }
        },
        { $count: "count" }
      ]),
      // Critical stock SKUs: currentStock <= criticalStock
      InventoryItem.aggregate([
        { $match: { stationId: stId } },
        {
          $match: {
            $expr: {
              $lte: ["$currentStock", "$criticalStock"]
            }
          }
        },
        { $count: "count" }
      ])
    ]);

    const summary = summaryAgg[0] || { totalSKUs: 0, totalStock: 0 };
    const lowStockCount = lowStockAgg[0]?.count || 0;
    const criticalCount = criticalAgg[0]?.count || 0;

    return res.status(200).json({
      success: true,
      summary: {
        totalSKUs: summary.totalSKUs || 0,
        totalStock: summary.totalStock || 0,
        lowStockCount,
        criticalCount,
        recentReceipts
      }
    });
  } catch (err) {
    console.error("[getStationInventorySummary]", err);
    return res.status(500).json({ success: false, message: "Failed to fetch inventory summary" });
  }
};

/**
 * GET /api/inventory/:stationId/:skuId/batches
 *
 * Returns all AVAILABLE batches for a specific SKU at a station,
 * sorted by receivedAt ASC (FCFS order).
 */
export const getItemBatches = async (req, res) => {
  try {
    const { stationId, skuId } = req.params;

    const stId = await resolveStationId(stationId);
    if (!stId) {
      return res.status(400).json({ success: false, message: "Invalid station ID" });
    }

    // Station authorization validation
    const access = await validateStationAccess(req, stId);
    if (!access.allowed) {
      return res.status(access.statusCode || 403).json({
        success: false,
        message: access.message
      });
    }

    // skuId can be a MongoDB ObjectId or a skuCode string
    let batchQuery = { stationId: stId };

    if (mongoose.Types.ObjectId.isValid(skuId)) {
      batchQuery.skuId = new mongoose.Types.ObjectId(skuId);
    } else {
      // Treat as skuCode
      batchQuery.skuCode = skuId.toUpperCase();
    }

    const batches = await InventoryBatch.find(batchQuery)
      .populate("sourceManifestId", "manifestNumber status")
      .sort({ receivedAt: 1 }) // oldest first = FCFS order
      .lean();

    const totalRemaining = batches
      .filter(b => b.status === "AVAILABLE")
      .reduce((sum, b) => sum + b.remainingQuantity, 0);

    return res.status(200).json({
      success: true,
      skuId,
      stationId,
      totalRemaining,
      batchCount: batches.filter(b => b.status === "AVAILABLE").length,
      batches
    });
  } catch (err) {
    console.error("[getItemBatches]", err);
    return res.status(500).json({ success: false, message: "Failed to fetch batches" });
  }
};

/**
 * POST /api/inventory/:stationId/consume
 *
 * FCFS stock consumption. Atomically:
 *   1. Validate user and station authorization
 *   2. Check eventId for idempotency
 *   3. Pre-flight check: total available stock
 *   4. Deduct from oldest available batches first (FCFS)
 *   5. Mark depleted batches as DEPLETED
 *   6. Update InventoryItem aggregate & recalculate status
 *   7. Create CONSUMPTION transaction with batch allocations
 *
 * Body: { skuId, skuCode, quantity, reason, notes, eventId, offlineCreated }
 */
export const consumeStock = async (req, res) => {
  try {
    const { stationId } = req.params;
    const { skuId, skuCode, quantity, reason, notes, eventId } = req.body;

    const stId = await resolveStationId(stationId);
    if (!stId) {
      return res.status(400).json({ success: false, message: "Invalid station ID" });
    }

    // Role / Station authorization check:
    const access = await validateStationAccess(req, stId);
    if (!access.allowed) {
      return res.status(access.statusCode || 403).json({
        success: false,
        message: access.message
      });
    }

    const performedBy = req.user?.userId || req.user?.id || req.user?._id;

    const result = await consumeInventoryFCFS({
      stationId: stId,
      skuId,
      skuCode,
      quantity,
      reason,
      notes,
      eventId,
      performedBy,
      offlineCreated: Boolean(req.body.offlineCreated)
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error("[consumeStock]", err);
    const statusCode = err.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: err.message || "Failed to consume stock",
      available: err.available,
      requested: err.requested
    });
  }
};

/**
 * GET /api/inventory/stations
 *
 * HQ view: summary per station.
 */
export const getAllStationsInventory = async (req, res) => {
  try {
    const stations = await Station.find({ stationType: { $ne: "HEADQUARTERS" } }).lean();

    const summaries = await Promise.all(
      stations.map(async (station) => {
        const stId = station._id;

        const [agg, lowStock, outOfStock] = await Promise.all([
          InventoryBatch.aggregate([
            { $match: { stationId: stId, status: "AVAILABLE" } },
            {
              $group: {
                _id: "$skuCode",
                totalRemaining: { $sum: "$remainingQuantity" }
              }
            },
            {
              $group: {
                _id: null,
                totalSKUs: { $sum: 1 },
                totalStock: { $sum: "$totalRemaining" }
              }
            }
          ]),
          InventoryItem.countDocuments({
            stationId: stId,
            status: { $in: ["LOW_STOCK", "CRITICAL"] }
          }),
          InventoryItem.countDocuments({ stationId: stId, status: "OUT_OF_STOCK" })
        ]);

        return {
          station: {
            _id: station._id,
            name: station.name,
            code: station.code,
            stationType: station.stationType,
            operationalStatus: station.operationalStatus
          },
          totalSKUs: agg[0]?.totalSKUs || 0,
          totalStock: agg[0]?.totalStock || 0,
          lowStockCount: lowStock,
          outOfStockCount: outOfStock
        };
      })
    );

    return res.status(200).json({
      success: true,
      count: summaries.length,
      stations: summaries
    });
  } catch (err) {
    console.error("[getAllStationsInventory]", err);
    return res.status(500).json({ success: false, message: "Failed to fetch station inventories" });
  }
};

/**
 * GET /api/inventory/:stationId/transactions
 *
 * Paginated transaction history for a station.
 */
export const getTransactionHistory = async (req, res) => {
  try {
    const { stationId } = req.params;
    const { page = 1, limit = 30, type, skuCode } = req.query;

    const stId = await resolveStationId(stationId);
    if (!stId) {
      return res.status(400).json({ success: false, message: "Invalid station ID" });
    }

    // Station authorization validation
    const access = await validateStationAccess(req, stId);
    if (!access.allowed) {
      return res.status(access.statusCode || 403).json({
        success: false,
        message: access.message
      });
    }

    const filter = { stationId: stId };
    if (type && type !== "ALL") filter.transactionType = type.toUpperCase();
    if (skuCode) filter.skuCode = skuCode.toUpperCase();

    const skip = (Number(page) - 1) * Number(limit);

    const [transactions, total] = await Promise.all([
      InventoryTransaction.find(filter)
        .populate("performedBy", "name employeeId role")
        .populate("sourceManifestId", "manifestNumber")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      InventoryTransaction.countDocuments(filter)
    ]);

    return res.status(200).json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      transactions
    });
  } catch (err) {
    console.error("[getTransactionHistory]", err);
    return res.status(500).json({ success: false, message: "Failed to fetch transactions" });
  }
};

/**
 * POST /api/inventory/:stationId/receive
 *
 * Manual receipt trigger — forces inventory receipt for an already-DELIVERED manifest.
 * Useful if the auto-receipt failed or was missed.
 * Body: { manifestId }
 */
export const manualReceiveCargo = async (req, res) => {
  try {
    const { stationId } = req.params;
    const { manifestId } = req.body;

    const stId = await resolveStationId(stationId);
    if (!stId) {
      return res.status(400).json({ success: false, message: "Invalid station ID" });
    }

    // Station authorization validation
    const access = await validateStationAccess(req, stId);
    if (!access.allowed) {
      return res.status(access.statusCode || 403).json({
        success: false,
        message: access.message
      });
    }

    if (!manifestId || !mongoose.Types.ObjectId.isValid(manifestId)) {
      return res.status(400).json({ success: false, message: "Valid manifestId is required" });
    }

    const performedBy = req.user?.userId || req.user?.id || req.user?._id;
    const result = await processManifestDelivery(manifestId, performedBy);

    return res.status(200).json({
      success: true,
      message: `Manual receipt complete. Processed: ${result.processed}, Skipped (already received): ${result.skipped}`,
      ...result
    });
  } catch (err) {
    console.error("[manualReceiveCargo]", err);
    return res.status(500).json({ success: false, message: err.message || "Failed to process manual receipt" });
  }
};
