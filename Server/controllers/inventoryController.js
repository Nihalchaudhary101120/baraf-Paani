import mongoose from "mongoose";
import crypto from "crypto";
import InventoryBatch from "../models/inventory-models/inventory-batch.js";
import InventoryItem from "../models/inventory-models/inventory-item.js";
import InventoryTransaction from "../models/inventory-models/inventory-transaction.js";
import Station from "../models/master-models/station.js";
import processManifestDelivery from "../services/inventoryReceiptService.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

const generateTransactionNumber = () =>
  `INV-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

const resolveStationId = async (input) => {
  if (!input) return null;
  if (mongoose.Types.ObjectId.isValid(input)) return new mongoose.Types.ObjectId(input);
  const found = await Station.findOne({
    $or: [
      { code: String(input).toUpperCase() },
      { name: new RegExp(`^${input}`, "i") }
    ]
  }) || await Station.findOne({ code: "BHARATI" }) || await Station.findOne();
  return found ? found._id : null;
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
        $addFields: {
          stockStatus: {
            $switch: {
              branches: [
                { case: { $lte: ["$totalRemaining", 0] }, then: "OUT_OF_STOCK" },
                { case: { $lte: ["$totalRemaining", 5] }, then: "CRITICAL" },
                { case: { $lte: ["$totalRemaining", 10] }, then: "LOW_STOCK" }
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

    const [summaryAgg, recentReceipts, lowStockAgg] = await Promise.all([
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
      // Low stock SKUs — using InventoryItem thresholds
      InventoryItem.aggregate([
        { $match: { stationId: stId } },
        {
          $match: {
            $expr: {
              $and: [
                { $gt: ["$currentStock", 0] },
                { $lte: ["$currentStock", "$minimumStock"] }
              ]
            }
          }
        },
        { $count: "lowCount" }
      ])
    ]);

    const summary = summaryAgg[0] || { totalSKUs: 0, totalStock: 0 };

    // Out of stock count
    const outOfStock = await InventoryItem.countDocuments({ stationId: stId, currentStock: 0 });

    return res.status(200).json({
      success: true,
      summary: {
        totalSKUs: summary.totalSKUs || 0,
        totalStock: summary.totalStock || 0,
        lowStockCount: lowStockAgg[0]?.lowCount || 0,
        outOfStockCount: outOfStock,
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
 *   1. Validate sufficient stock
 *   2. Deduct from oldest available batches first
 *   3. Mark depleted batches as DEPLETED
 *   4. Update InventoryItem aggregate
 *   5. Create CONSUMPTION transaction with batch allocations
 *
 * Body: { skuId, skuCode, quantity, reason, notes }
 */
export const consumeStock = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { stationId } = req.params;
    const { skuId, skuCode, quantity, reason, notes } = req.body;

    const stId = await resolveStationId(stationId);
    if (!stId) {
      return res.status(400).json({ success: false, message: "Invalid station ID" });
    }

    const requestedQty = Number(quantity);
    if (!requestedQty || requestedQty <= 0) {
      return res.status(400).json({ success: false, message: "Quantity must be greater than 0" });
    }

    if (!skuId && !skuCode) {
      return res.status(400).json({ success: false, message: "skuId or skuCode is required" });
    }

    // Build query for batches
    let batchQuery = { stationId: stId, status: "AVAILABLE" };
    if (skuId && mongoose.Types.ObjectId.isValid(skuId)) {
      batchQuery.skuId = new mongoose.Types.ObjectId(skuId);
    } else if (skuCode) {
      batchQuery.skuCode = skuCode.toUpperCase();
    }

    // ── Pre-flight: check total available stock ────────────────────────
    // Do this BEFORE opening the session to avoid long-held locks
    const availableBatches = await InventoryBatch.find(batchQuery)
      .sort({ receivedAt: 1 }) // FCFS: oldest first
      .lean();

    const totalAvailable = availableBatches.reduce((sum, b) => sum + b.remainingQuantity, 0);

    if (totalAvailable < requestedQty) {
      return res.status(400).json({
        success: false,
        message: `Insufficient inventory. Available: ${totalAvailable} ${availableBatches[0]?.unit || ""}, requested: ${requestedQty}.`,
        available: totalAvailable,
        requested: requestedQty
      });
    }

    // ── Start MongoDB session for atomic consumption ───────────────────
    let consumptionAllocations = [];
    let updatedBatches = [];
    let inventoryItem = null;
    const performedBy = req.user?.userId || req.user?.id || req.user?._id;

    try {
      session.startTransaction();

      let remaining = requestedQty;

      for (const batchLean of availableBatches) {
        if (remaining <= 0) break;

        const batch = await InventoryBatch.findById(batchLean._id).session(session);
        if (!batch || batch.status !== "AVAILABLE") continue;

        const toConsume = Math.min(remaining, batch.remainingQuantity);
        batch.remainingQuantity -= toConsume;
        remaining -= toConsume;

        if (batch.remainingQuantity <= 0) {
          batch.remainingQuantity = 0;
          batch.status = "DEPLETED";
        }

        await batch.save({ session });

        consumptionAllocations.push({
          batchId: batch._id,
          quantity: toConsume
        });
        updatedBatches.push(batch);
      }

      // ── Update InventoryItem aggregate ─────────────────────────────
      let itemQuery = { stationId: stId };
      if (skuId && mongoose.Types.ObjectId.isValid(skuId)) {
        itemQuery.skuId = new mongoose.Types.ObjectId(skuId);
      } else {
        itemQuery.itemCode = (skuCode || availableBatches[0]?.skuCode || "").toUpperCase();
      }

      inventoryItem = await InventoryItem.findOne(itemQuery).session(session);
      if (inventoryItem) {
        inventoryItem.currentStock = Math.max(0, inventoryItem.currentStock - requestedQty);

        // Recalculate status
        if (inventoryItem.currentStock <= 0) {
          inventoryItem.status = "OUT_OF_STOCK";
        } else if (inventoryItem.currentStock <= inventoryItem.criticalStock) {
          inventoryItem.status = "CRITICAL";
        } else if (inventoryItem.currentStock <= inventoryItem.minimumStock) {
          inventoryItem.status = "LOW_STOCK";
        } else {
          inventoryItem.status = "AVAILABLE";
        }
        await inventoryItem.save({ session });
      }

      // ── Create CONSUMPTION transaction ─────────────────────────────
      const firstBatch = availableBatches[0];
      const transaction = await InventoryTransaction.create(
        [
          {
            transactionNumber: generateTransactionNumber(),
            eventId: crypto.randomUUID(),
            inventoryItemId: inventoryItem?._id || firstBatch?.sourceManifestId,
            stationId: stId,
            skuId: firstBatch?.skuId || undefined,
            skuCode: firstBatch?.skuCode,
            transactionType: "CONSUMPTION",
            quantity: requestedQty,
            balanceAfterTransaction: inventoryItem?.currentStock ?? (totalAvailable - requestedQty),
            consumptionAllocations,
            performedBy,
            reason: reason || "Station consumption",
            remarks: notes || "",
            syncStatus: "SYNCED"
          }
        ],
        { session }
      );

      await session.commitTransaction();

      return res.status(200).json({
        success: true,
        message: `${requestedQty} ${firstBatch?.unit || "units"} of ${firstBatch?.itemName || skuCode} consumed successfully.`,
        consumed: requestedQty,
        remainingTotal: totalAvailable - requestedQty,
        consumptionAllocations,
        transaction: transaction[0],
        inventoryItem
      });
    } catch (txErr) {
      await session.abortTransaction();
      throw txErr;
    }
  } catch (err) {
    console.error("[consumeStock]", err);

    // Handle case where sessions aren't supported (standalone MongoDB)
    if (err.message?.includes("Transaction") || err.message?.includes("session")) {
      return await consumeStockFallback(req, res);
    }

    return res.status(500).json({ success: false, message: err.message || "Failed to consume stock" });
  } finally {
    await session.endSession();
  }
};

/**
 * Fallback for standalone MongoDB instances that don't support sessions.
 * Same logic but without transaction guarantees.
 */
const consumeStockFallback = async (req, res) => {
  try {
    const { stationId } = req.params;
    const { skuId, skuCode, quantity, reason, notes } = req.body;
    const requestedQty = Number(quantity);
    const stId = await resolveStationId(stationId);
    if (!stId) {
      return res.status(400).json({ success: false, message: "Invalid station ID" });
    }
    const performedBy = req.user?.userId || req.user?.id || req.user?._id;

    let batchQuery = { stationId: stId, status: "AVAILABLE" };
    if (skuId && mongoose.Types.ObjectId.isValid(skuId)) {
      batchQuery.skuId = new mongoose.Types.ObjectId(skuId);
    } else if (skuCode) {
      batchQuery.skuCode = skuCode.toUpperCase();
    }

    const batches = await InventoryBatch.find(batchQuery).sort({ receivedAt: 1 });
    const totalAvailable = batches.reduce((sum, b) => sum + b.remainingQuantity, 0);

    if (totalAvailable < requestedQty) {
      return res.status(400).json({
        success: false,
        message: `Insufficient inventory. Available: ${totalAvailable}, requested: ${requestedQty}.`,
        available: totalAvailable,
        requested: requestedQty
      });
    }

    let remaining = requestedQty;
    const consumptionAllocations = [];

    for (const batch of batches) {
      if (remaining <= 0) break;
      const toConsume = Math.min(remaining, batch.remainingQuantity);
      batch.remainingQuantity -= toConsume;
      remaining -= toConsume;
      if (batch.remainingQuantity <= 0) {
        batch.remainingQuantity = 0;
        batch.status = "DEPLETED";
      }
      await batch.save();
      consumptionAllocations.push({ batchId: batch._id, quantity: toConsume });
    }

    let itemQuery = { stationId: stId };
    if (skuId && mongoose.Types.ObjectId.isValid(skuId)) {
      itemQuery.skuId = new mongoose.Types.ObjectId(skuId);
    } else {
      itemQuery.itemCode = (skuCode || batches[0]?.skuCode || "").toUpperCase();
    }

    const inventoryItem = await InventoryItem.findOne(itemQuery);
    if (inventoryItem) {
      inventoryItem.currentStock = Math.max(0, inventoryItem.currentStock - requestedQty);
      if (inventoryItem.currentStock <= 0) inventoryItem.status = "OUT_OF_STOCK";
      else if (inventoryItem.currentStock <= inventoryItem.criticalStock) inventoryItem.status = "CRITICAL";
      else if (inventoryItem.currentStock <= inventoryItem.minimumStock) inventoryItem.status = "LOW_STOCK";
      else inventoryItem.status = "AVAILABLE";
      await inventoryItem.save();
    }

    const firstBatch = batches[0];
    const transaction = await InventoryTransaction.create({
      transactionNumber: generateTransactionNumber(),
      eventId: crypto.randomUUID(),
      inventoryItemId: inventoryItem?._id,
      stationId: stId,
      skuId: firstBatch?.skuId || undefined,
      skuCode: firstBatch?.skuCode,
      transactionType: "CONSUMPTION",
      quantity: requestedQty,
      balanceAfterTransaction: inventoryItem?.currentStock ?? (totalAvailable - requestedQty),
      consumptionAllocations,
      performedBy,
      reason: reason || "Station consumption",
      remarks: notes || "",
      syncStatus: "SYNCED"
    });

    return res.status(200).json({
      success: true,
      message: `${requestedQty} ${firstBatch?.unit || "units"} of ${firstBatch?.itemName || skuCode} consumed successfully.`,
      consumed: requestedQty,
      remainingTotal: totalAvailable - requestedQty,
      consumptionAllocations,
      transaction,
      inventoryItem
    });
  } catch (err) {
    console.error("[consumeStockFallback]", err);
    return res.status(500).json({ success: false, message: err.message || "Failed to consume stock" });
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
