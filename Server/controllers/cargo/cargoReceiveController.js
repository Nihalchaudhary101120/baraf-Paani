import mongoose from "mongoose";
import crypto from "crypto";

import CargoManifest from "../../models/cargo-models/cargo-menifest.js";
import CargoCheckpoint from "../../models/cargo-models/cargo-checkpoint.js";
import SKU from "../../models/cargo-models/sku.js";
import Station from "../../models/master-models/station.js";
import User from "../../models/master-models/user.js";
import InventoryItem from "../../models/inventory-models/inventory-item.js";
import InventoryTransaction from "../../models/inventory-models/inventory-transaction.js";
import InventoryBatch from "../../models/inventory-models/inventory-batch.js";

/**
 * Recalculate InventoryItem status based on stock vs thresholds.
 */
const recalcStatus = (item) => {
  if (item.currentStock <= 0) item.status = "OUT_OF_STOCK";
  else if (item.currentStock <= item.criticalStock) item.status = "CRITICAL";
  else if (item.currentStock <= item.minimumStock) item.status = "LOW_STOCK";
  else item.status = "AVAILABLE";
};

/**
 * POST /api/cargo/receiving
 *
 * Accept a specific cargo item at the destination station.
 * This is the item-by-item manual receive flow (triggered from the
 * "Accept Cargo" UI in the Cargo Dashboard).
 *
 * On each call:
 *   1. Marks the cargo item as RECEIVED inside the manifest
 *   2. Creates an InventoryBatch for FCFS tracking (idempotent)
 *   3. Updates InventoryItem aggregate (fast-read layer)
 *   4. Creates a RECEIPT InventoryTransaction
 *   5. When ALL items received → sets manifest.status = DELIVERED
 */
export const receiveCargo = async (req, res) => {
  try {
    const {
      manifestId,
      itemCode,
      boxCode,
      acceptedQuantity,
      damagedQuantity = 0,
      remarks,
      skipCheckpointCheck = true
    } = req.body;

    if (!manifestId) {
      return res.status(400).json({ success: false, message: "manifestId is required" });
    }

    const manifest = await CargoManifest.findById(manifestId);
    if (!manifest) {
      return res.status(404).json({ success: false, message: "Manifest not found." });
    }

    // Resolve Station ID (handles ObjectId, string code "BHARATI", or missing destination)
    let stationId = manifest.destination || req.body.stationId;
    if (!stationId || !mongoose.Types.ObjectId.isValid(stationId)) {
      const stationDoc = await Station.findOne({
        $or: [
          { code: String(stationId || "BHARATI").toUpperCase() },
          { name: new RegExp(`^${stationId || "Bharati"}`, "i") },
          { code: "BHARATI" }
        ]
      }) || await Station.findOne();
      stationId = stationDoc?._id;
    }

    if (!stationId) {
      return res.status(400).json({ success: false, message: "Could not resolve destination station." });
    }

    // Resolve PerformedBy to a valid ObjectId
    let performedBy = req.user?.userId || req.user?.id || req.user?._id;
    if (!performedBy || !mongoose.Types.ObjectId.isValid(performedBy)) {
      const defaultUser = await User.findOne();
      performedBy = defaultUser?._id;
    }

    // Find the item within the manifest
    const targetCode = String(boxCode || itemCode || "").trim();
    let manifestItem = manifest.items.find(
      i => (i.itemCode && i.itemCode.trim().toLowerCase() === targetCode.toLowerCase()) ||
           (i.boxCode && i.boxCode.trim().toLowerCase() === targetCode.toLowerCase()) ||
           (i.trackingCode && i.trackingCode.trim().toLowerCase() === targetCode.toLowerCase()) ||
           (i._id && i._id.toString() === targetCode)
    );

    // Fallback if targetCode matches partially or manifest only has one item
    if (!manifestItem && manifest.items.length === 1) {
      manifestItem = manifest.items[0];
    }

    const qtyToReceive = Number(acceptedQuantity) ||
      (manifestItem ? Number(manifestItem.quantity || manifestItem.packageCount || 1) : 1);

    // Optional checkpoint check
    if (!skipCheckpointCheck) {
      const latestCheckpoint = await CargoCheckpoint.findOne({
        manifestId,
        itemCode: targetCode
      }).sort({ createdAt: -1 });

      if (!latestCheckpoint) {
        return res.status(400).json({
          success: false,
          message: "Item has not been scanned at arrival checkpoint."
        });
      }
    }

    // ── Resolve SKU details ─────────────────────────────────────────────────
    let skuDoc = null;
    if (manifestItem?.skuId && mongoose.Types.ObjectId.isValid(manifestItem.skuId)) {
      skuDoc = await SKU.findById(manifestItem.skuId).lean();
    } else if (manifestItem?.skuCode) {
      skuDoc = await SKU.findOne({ skuCode: manifestItem.skuCode.toUpperCase().trim() }).lean();
    }

    const skuId = skuDoc?._id || (manifestItem?.skuId && mongoose.Types.ObjectId.isValid(manifestItem.skuId) ? manifestItem.skuId : null);
    const skuCode = (skuDoc?.skuCode || manifestItem?.skuCode || manifestItem?.itemCode || targetCode || "GENERAL").toUpperCase().trim();
    const itemName = manifestItem?.itemName || skuDoc?.itemName || manifestItem?.description || skuCode;
    const rawCategory = (manifestItem?.category || skuDoc?.category || "GENERAL").toUpperCase().trim();
    const rawUnit = (manifestItem?.unit || skuDoc?.unit || "PCS").toUpperCase().trim();

    // Map to allowed enums for InventoryItem and InventoryBatch
    const ALLOWED_ITEM_CATEGORIES = ["FOOD", "FUEL", "MEDICAL", "SCIENTIFIC", "SPARES", "ELECTRONICS", "SAFETY", "GENERAL"];
    const itemCategory = ALLOWED_ITEM_CATEGORIES.includes(rawCategory) ? rawCategory : "GENERAL";

    const ALLOWED_BATCH_CATEGORIES = ["FOOD", "FUEL", "MEDICAL", "SCIENTIFIC", "PERSONAL", "SPARES", "ELECTRONICS", "EQUIPMENT", "SAFETY", "GENERAL"];
    const batchCategory = ALLOWED_BATCH_CATEGORIES.includes(rawCategory) ? rawCategory : "GENERAL";

    const ALLOWED_ITEM_UNITS = ["KG", "LITRE", "BOX", "PCS", "CYLINDER", "BAG", "SET"];
    const itemUnit = ALLOWED_ITEM_UNITS.includes(rawUnit) ? rawUnit : "PCS";

    // ── Create InventoryBatch (idempotent) ──────────────────────────────────
    const cargoItemId = (manifestItem?._id && mongoose.Types.ObjectId.isValid(manifestItem._id))
      ? manifestItem._id
      : new mongoose.Types.ObjectId();

    let batch = await InventoryBatch.findOne({
      stationId,
      sourceManifestId: manifest._id,
      sourceCargoItemId: cargoItemId
    });

    let batchIsNew = false;
    if (!batch) {
      try {
        batch = await InventoryBatch.create({
          stationId,
          skuId: skuId || undefined,
          skuCode,
          itemName,
          category: batchCategory,
          unit: itemUnit,
          receivedQuantity: qtyToReceive,
          remainingQuantity: qtyToReceive,
          sourceManifestId: manifest._id,
          sourceManifestNumber: manifest.manifestNumber,
          sourceCargoItemId: cargoItemId,
          receivedAt: new Date(),
          status: "AVAILABLE"
        });
        batchIsNew = true;
      } catch (dupErr) {
        if (dupErr.code === 11000) {
          batch = await InventoryBatch.findOne({
            stationId,
            sourceManifestId: manifest._id,
            sourceCargoItemId: cargoItemId
          });
          batchIsNew = false;
        } else {
          throw dupErr;
        }
      }
    }

    // ── Upsert InventoryItem (aggregated fast-read layer) ───────────────────
    let inventoryItem = null;

    if (skuId) {
      inventoryItem = await InventoryItem.findOne({ stationId, skuId });
    }
    if (!inventoryItem) {
      inventoryItem = await InventoryItem.findOne({ stationId, itemCode: skuCode });
    }
    if (!inventoryItem) {
      inventoryItem = await InventoryItem.findOne({ itemCode: skuCode });
    }

    if (!inventoryItem) {
      try {
        inventoryItem = await InventoryItem.create({
          itemCode: skuCode,
          name: itemName,
          category: itemCategory,
          stationId,
          unit: itemUnit,
          currentStock: 0,
          inTransitStock: 0,
          reservedStock: 0,
          minimumStock: skuDoc?.minStockLevel || 10,
          criticalStock: skuDoc?.reorderLevel || 5,
          skuId: skuId || undefined,
          status: "AVAILABLE"
        });
      } catch (createErr) {
        if (createErr.code === 11000) {
          inventoryItem = await InventoryItem.findOne({ itemCode: skuCode });
        } else {
          throw createErr;
        }
      }
    }

    // Only add stock when this specific cargo item is being received for the FIRST time.
    if (batchIsNew) {
      inventoryItem.currentStock = (inventoryItem.currentStock || 0) + qtyToReceive;
      inventoryItem.inTransitStock = Math.max(0, (inventoryItem.inTransitStock || 0) - qtyToReceive);
      recalcStatus(inventoryItem);
      await inventoryItem.save();

      // Create RECEIPT transaction
      try {
        await InventoryTransaction.create({
          transactionNumber: `INV-${Date.now()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`,
          eventId: crypto.randomUUID(),
          inventoryItemId: inventoryItem._id,
          stationId,
          expeditionId: (manifest.expeditionId && mongoose.Types.ObjectId.isValid(manifest.expeditionId)) ? manifest.expeditionId : undefined,
          skuId: skuId || undefined,
          skuCode,
          transactionType: "RECEIPT",
          quantity: qtyToReceive,
          balanceAfterTransaction: inventoryItem.currentStock,
          sourceManifestId: manifest._id,
          sourceManifestNumber: manifest.manifestNumber,
          performedBy,
          syncStatus: "SYNCED",
          remarks: remarks || `Item ${skuCode} received at station from manifest ${manifest.manifestNumber}. Damaged: ${damagedQuantity}`
        });
      } catch (txErr) {
        console.warn("[receiveCargo] Transaction creation warning:", txErr.message);
      }
    } else {
      recalcStatus(inventoryItem);
      await inventoryItem.save();
    }

    // ── Update cargo item status in manifest ────────────────────────────────
    if (manifestItem) {
      manifestItem.status = "RECEIVED";
      const allReceived = manifest.items.every(it => it.status === "RECEIVED");

      if (allReceived && manifest.status !== "DELIVERED") {
        manifest.status = "DELIVERED";
      } else if (!allReceived && manifest.status !== "DELIVERED") {
        manifest.status = "IN_TRANSIT";
      }

      await manifest.save();
    }

    return res.status(200).json({
      success: true,
      message: `Cargo accepted successfully. ${qtyToReceive} ${itemUnit} of ${itemName} added to station inventory.`,
      batch: batch || null,
      inventoryItem,
      manifestStatus: manifest.status
    });
  } catch (error) {
    console.error("Receive cargo error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to process cargo receipt"
    });
  }
};