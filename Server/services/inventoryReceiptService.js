import crypto from "crypto";
import mongoose from "mongoose";
import CargoManifest from "../models/cargo-models/cargo-menifest.js";
import InventoryBatch from "../models/inventory-models/inventory-batch.js";
import InventoryItem from "../models/inventory-models/inventory-item.js";
import InventoryTransaction from "../models/inventory-models/inventory-transaction.js";
import SKU from "../models/cargo-models/sku.js";

/**
 * Generates a sequential transaction number.
 */
const generateTransactionNumber = () => `INV-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

/**
 * Recalculate and update the status of an InventoryItem based on current stock vs SKU thresholds.
 */
const recalculateItemStatus = (item) => {
  if (item.currentStock <= 0) {
    item.status = "OUT_OF_STOCK";
  } else if (item.currentStock <= item.criticalStock) {
    item.status = "CRITICAL";
  } else if (item.currentStock <= item.minimumStock) {
    item.status = "LOW_STOCK";
  } else {
    item.status = "AVAILABLE";
  }
};

/**
 * Process all CargoItems in a manifest and add them to the station's inventory.
 *
 * This function is IDEMPOTENT: calling it multiple times with the same manifestId
 * will NOT create duplicate batches. The compound unique index on
 * { stationId, sourceManifestId, sourceCargoItemId } prevents duplicates.
 *
 * @param {string|ObjectId} manifestId - The _id of the CargoManifest
 * @param {string|ObjectId} performedBy - The _id of the User who triggered the delivery
 * @returns {Object} receipt summary { processed, skipped, errors }
 */
export const processManifestDelivery = async (manifestId, performedBy) => {
  const manifest = await CargoManifest.findById(manifestId);
  if (!manifest) {
    throw new Error(`Manifest ${manifestId} not found`);
  }

  if (!manifest.destination) {
    throw new Error(`Manifest ${manifestId} has no destination station`);
  }

  const stationId = manifest.destination;
  const items = manifest.items || [];

  if (items.length === 0) {
    return { processed: 0, skipped: 0, errors: [] };
  }

  const results = { processed: 0, skipped: 0, errors: [] };

  for (const cargoItem of items) {
    try {
      // ── Idempotency check ──────────────────────────────────────────────
      const existingBatch = await InventoryBatch.findOne({
        stationId,
        sourceManifestId: manifest._id,
        sourceCargoItemId: cargoItem._id
      });

      if (existingBatch) {
        // Already processed — skip silently
        results.skipped++;
        continue;
      }

      // ── Resolve SKU data ───────────────────────────────────────────────
      let skuDoc = null;
      if (cargoItem.skuId) {
        skuDoc = await SKU.findById(cargoItem.skuId).lean();
      } else if (cargoItem.skuCode) {
        skuDoc = await SKU.findOne({ skuCode: cargoItem.skuCode.toUpperCase() }).lean();
      }

      const skuId = skuDoc?._id || cargoItem.skuId || null;
      const skuCode = skuDoc?.skuCode || cargoItem.skuCode || cargoItem.itemCode || "GENERAL";
      const itemName = cargoItem.itemName || skuDoc?.itemName || cargoItem.description || skuCode;
      const category = cargoItem.category || skuDoc?.category || "GENERAL";
      const validUnits = ["PCS", "KIT", "BOX", "KG", "LITRE", "LTR", "CYLINDER", "BAG", "SET", "PALLET", "PKT", "UNITS"];
      const unit = validUnits.includes(cargoItem.unit) ? cargoItem.unit : (skuDoc?.unit || "PCS");
      const receivedQty = Number(cargoItem.quantity) || 1;

      // ── Create InventoryBatch ──────────────────────────────────────────
      const batch = await InventoryBatch.create({
        stationId,
        skuId,
        skuCode,
        itemName,
        category,
        unit,
        receivedQuantity: receivedQty,
        remainingQuantity: receivedQty,
        sourceManifestId: manifest._id,
        sourceManifestNumber: manifest.manifestNumber,
        sourceCargoItemId: cargoItem._id,
        receivedAt: new Date(),
        status: "AVAILABLE"
      });

      // ── Upsert InventoryItem (aggregated fast-read layer) ──────────────
      let inventoryItem = null;

      // Try by skuId first, then by itemCode at station
      if (skuId) {
        inventoryItem = await InventoryItem.findOne({ stationId, skuId });
      }
      if (!inventoryItem && skuCode) {
        inventoryItem = await InventoryItem.findOne({ stationId, itemCode: skuCode });
      }

      if (!inventoryItem) {
        // Create new InventoryItem for this SKU at this station
        inventoryItem = new InventoryItem({
          itemCode: skuCode,
          name: itemName,
          category,
          stationId,
          unit,
          currentStock: 0,
          inTransitStock: 0,
          reservedStock: 0,
          minimumStock: skuDoc?.minStockLevel || 10,
          criticalStock: skuDoc?.reorderLevel || 5,
          skuId: skuId || undefined,
          status: "AVAILABLE"
        });
      }

      inventoryItem.currentStock = (inventoryItem.currentStock || 0) + receivedQty;
      // Reduce in-transit stock if it was tracked
      inventoryItem.inTransitStock = Math.max(0, (inventoryItem.inTransitStock || 0) - receivedQty);
      recalculateItemStatus(inventoryItem);
      await inventoryItem.save();

      // ── Create RECEIPT transaction ─────────────────────────────────────
      await InventoryTransaction.create({
        transactionNumber: generateTransactionNumber(),
        eventId: crypto.randomUUID(),
        inventoryItemId: inventoryItem._id,
        stationId,
        expeditionId: manifest.expeditionId || undefined,
        skuId: skuId || undefined,
        skuCode,
        transactionType: "RECEIPT",
        quantity: receivedQty,
        balanceAfterTransaction: inventoryItem.currentStock,
        sourceManifestId: manifest._id,
        sourceManifestNumber: manifest.manifestNumber,
        performedBy,
        syncStatus: "SYNCED",
        remarks: `Auto-received from manifest ${manifest.manifestNumber} on delivery`
      });

      results.processed++;
    } catch (err) {
      // Idempotency violations (duplicate key) are silently skipped
      if (err.code === 11000) {
        results.skipped++;
      } else {
        results.errors.push({ itemId: cargoItem._id?.toString(), error: err.message });
        console.error(`[InventoryReceipt] Error processing item ${cargoItem._id}:`, err.message);
      }
    }
  }

  console.log(
    `[InventoryReceipt] Manifest ${manifest.manifestNumber}: processed=${results.processed}, skipped=${results.skipped}, errors=${results.errors.length}`
  );

  return results;
};

export default processManifestDelivery;
