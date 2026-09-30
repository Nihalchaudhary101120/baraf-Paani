import mongoose from "mongoose";
import crypto from "crypto";
import InventoryBatch from "../models/inventory-models/inventory-batch.js";
import InventoryItem from "../models/inventory-models/inventory-item.js";
import InventoryTransaction from "../models/inventory-models/inventory-transaction.js";
import SKU from "../models/cargo-models/sku.js";

const generateTransactionNumber = () =>
  `INV-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

/**
 * Atomic FCFS inventory consumption service.
 *
 * Implements:
 * 1. Idempotency check via eventId
 * 2. Pre-flight total stock verification
 * 3. Strict rejection if requestedQty > totalAvailable (no partial consumption)
 * 4. FCFS batch deduction (oldest receivedAt first)
 * 5. Batch status update (DEPLETED when remainingQuantity === 0)
 * 6. InventoryItem currentStock and status update (CRITICAL, LOW_STOCK, AVAILABLE, OUT_OF_STOCK)
 * 7. InventoryTransaction audit trail with consumptionAllocations
 *
 * @param {Object} params
 * @param {ObjectId|string} params.stationId
 * @param {ObjectId|string} [params.skuId]
 * @param {string} [params.skuCode]
 * @param {number} params.quantity
 * @param {string} [params.reason]
 * @param {string} [params.notes]
 * @param {string} [params.eventId]
 * @param {ObjectId|string} params.performedBy
 * @param {boolean} [params.offlineCreated=false]
 * @param {mongoose.ClientSession} [params.externalSession]
 */
export const consumeInventoryFCFS = async ({
  stationId,
  skuId,
  skuCode,
  quantity,
  reason = "Station consumption",
  notes = "",
  eventId,
  performedBy,
  offlineCreated = false,
  externalSession = null
}) => {
  const requestedQty = Number(quantity);
  if (!requestedQty || requestedQty <= 0) {
    throw new Error("Quantity must be greater than 0");
  }

  if (!stationId) {
    throw new Error("stationId is required");
  }

  if (!skuId && !skuCode) {
    throw new Error("skuId or skuCode is required");
  }

  // ── 1. Idempotency Check ──────────────────────────────────────────────────
  if (eventId) {
    const existingTx = await InventoryTransaction.findOne({ eventId })
      .populate("performedBy", "name employeeId role")
      .lean();

    if (existingTx) {
      return {
        success: true,
        alreadyProcessed: true,
        eventId,
        message: "Inventory consumption event already processed.",
        transaction: existingTx,
        consumed: existingTx.quantity,
        remainingTotal: existingTx.balanceAfterTransaction
      };
    }
  }

  // ── 2. Build Query for Available Batches ──────────────────────────────────
  const stObjectId = new mongoose.Types.ObjectId(stationId);
  const batchQuery = {
    stationId: stObjectId,
    status: "AVAILABLE",
    remainingQuantity: { $gt: 0 }
  };

  if (skuId && mongoose.Types.ObjectId.isValid(skuId)) {
    batchQuery.skuId = new mongoose.Types.ObjectId(skuId);
  } else if (skuCode) {
    batchQuery.skuCode = String(skuCode).toUpperCase().trim();
  }

  // ── 3. Pre-flight Check: Total Stock Available ────────────────────────────
  const availableBatches = await InventoryBatch.find(batchQuery)
    .sort({ receivedAt: 1 }) // FCFS: oldest first
    .lean();

  const totalAvailable = availableBatches.reduce((sum, b) => sum + (b.remainingQuantity || 0), 0);

  if (totalAvailable < requestedQty) {
    const unit = availableBatches[0]?.unit || "units";
    const itemLabel = availableBatches[0]?.itemName || skuCode || "item";
    const error = new Error(
      `Insufficient stock. Available: ${totalAvailable} ${unit}, requested: ${requestedQty} ${unit}.`
    );
    error.statusCode = 400;
    error.available = totalAvailable;
    error.requested = requestedQty;
    throw error;
  }

  // ── 4. Execute FCFS Consumption ──────────────────────────────────────────
  const executeWithSession = async (session) => {
    let remaining = requestedQty;
    const consumptionAllocations = [];
    const updatedBatches = [];

    for (const batchLean of availableBatches) {
      if (remaining <= 0) break;

      const batch = session
        ? await InventoryBatch.findById(batchLean._id).session(session)
        : await InventoryBatch.findById(batchLean._id);

      if (!batch || batch.status !== "AVAILABLE" || batch.remainingQuantity <= 0) {
        continue;
      }

      const toConsume = Math.min(remaining, batch.remainingQuantity);
      batch.remainingQuantity -= toConsume;
      remaining -= toConsume;

      if (batch.remainingQuantity <= 0) {
        batch.remainingQuantity = 0;
        batch.status = "DEPLETED";
      }

      if (session) {
        await batch.save({ session });
      } else {
        await batch.save();
      }

      consumptionAllocations.push({
        batchId: batch._id,
        quantity: toConsume
      });
      updatedBatches.push(batch);
    }

    // ── 5. Update InventoryItem Aggregate ─────────────────────────────────
    let itemQuery = { stationId: stObjectId };
    if (skuId && mongoose.Types.ObjectId.isValid(skuId)) {
      itemQuery.skuId = new mongoose.Types.ObjectId(skuId);
    } else {
      itemQuery.itemCode = (skuCode || availableBatches[0]?.skuCode || "").toUpperCase();
    }

    let inventoryItem = session
      ? await InventoryItem.findOne(itemQuery).session(session)
      : await InventoryItem.findOne(itemQuery);

    if (inventoryItem) {
      inventoryItem.currentStock = Math.max(0, (inventoryItem.currentStock || 0) - requestedQty);

      // Recalculate status dynamically based on item thresholds
      if (inventoryItem.currentStock <= 0) {
        inventoryItem.status = "OUT_OF_STOCK";
      } else if (inventoryItem.currentStock <= (inventoryItem.criticalStock ?? 5)) {
        inventoryItem.status = "CRITICAL";
      } else if (inventoryItem.currentStock <= (inventoryItem.minimumStock ?? 10)) {
        inventoryItem.status = "LOW_STOCK";
      } else {
        inventoryItem.status = "AVAILABLE";
      }

      if (session) {
        await inventoryItem.save({ session });
      } else {
        await inventoryItem.save();
      }
    }

    // ── 6. Create Audit Transaction ───────────────────────────────────────
    const firstBatch = availableBatches[0];
    const txEventId = eventId || crypto.randomUUID();
    const finalBalance = inventoryItem?.currentStock ?? (totalAvailable - requestedQty);

    const txDocData = {
      transactionNumber: generateTransactionNumber(),
      eventId: txEventId,
      inventoryItemId: inventoryItem?._id || firstBatch?.sourceManifestId,
      stationId: stObjectId,
      skuId: firstBatch?.skuId || (skuId && mongoose.Types.ObjectId.isValid(skuId) ? new mongoose.Types.ObjectId(skuId) : undefined),
      skuCode: firstBatch?.skuCode || (skuCode ? skuCode.toUpperCase() : undefined),
      transactionType: "CONSUMPTION",
      quantity: requestedQty,
      balanceAfterTransaction: finalBalance,
      consumptionAllocations,
      performedBy,
      reason: reason || "Station consumption",
      remarks: notes || "",
      offlineCreated: Boolean(offlineCreated),
      syncStatus: "SYNCED"
    };

    let transactionDoc;
    if (session) {
      const created = await InventoryTransaction.create([txDocData], { session });
      transactionDoc = created[0];
    } else {
      transactionDoc = await InventoryTransaction.create(txDocData);
    }

    return {
      success: true,
      message: `${requestedQty} ${firstBatch?.unit || "units"} of ${firstBatch?.itemName || skuCode} consumed successfully.`,
      consumed: requestedQty,
      remainingTotal: finalBalance,
      consumptionAllocations,
      transaction: transactionDoc,
      inventoryItem
    };
  };

  // If an external session was passed, use it directly
  if (externalSession) {
    return await executeWithSession(externalSession);
  }

  // Otherwise, start our own session with fallback for standalone Mongo
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const result = await executeWithSession(session);
    await session.commitTransaction();
    return result;
  } catch (err) {
    await session.abortTransaction();

    // Fallback if Mongo instance does not support replica set transactions
    if (err.message?.includes("Transaction") || err.message?.includes("session")) {
      console.warn("[InventoryConsumption] Mongo transactions unsupported, running standalone fallback");
      return await executeWithSession(null);
    }
    throw err;
  } finally {
    await session.endSession();
  }
};

export default consumeInventoryFCFS;
