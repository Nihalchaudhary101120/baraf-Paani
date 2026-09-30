import mongoose from "mongoose";
import crypto from "crypto";

import CargoManifest from "../../models/cargo-models/cargo-menifest.js";
import CargoCheckpoint from "../../models/cargo-models/cargo-checkpoint.js";
import SKU from "../../models/cargo-models/sku.js";
import InventoryItem from "../../models/inventory-models/inventory-item.js";
import InventoryTransaction from "../../models/inventory-models/inventory-transaction.js";

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

    const manifest = await CargoManifest.findById(manifestId);
    if (!manifest) {
      return res.status(404).json({
        success: false,
        message: "Manifest not found."
      });
    }

    const targetCode = boxCode || itemCode;
    const manifestItem = manifest.items.find(
      i => i.itemCode === targetCode || i.boxCode === targetCode || i._id.toString() === targetCode
    );

    const qtyToReceive = Number(acceptedQuantity) || (manifestItem ? Number(manifestItem.quantity || manifestItem.packageCount || 1) : 1);

    // Optional Checkpoint verification
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

    // Determine SKU code and details
    const resolvedSkuCode = (manifestItem?.skuCode || manifestItem?.itemCode || targetCode || "GENERAL").toUpperCase();
    const resolvedCategory = manifestItem?.category || "GENERAL";
    const resolvedName = manifestItem?.itemName || manifestItem?.description || resolvedSkuCode;
    const resolvedUnit = manifestItem?.unit || "PCS";

    // Find or create InventoryItem at destination station
    let inventoryItem = await InventoryItem.findOne({
      itemCode: resolvedSkuCode,
      stationId: manifest.destination
    });

    if (!inventoryItem) {
      // Find SKU details if available
      const skuData = await SKU.findOne({ skuCode: resolvedSkuCode });
      inventoryItem = new InventoryItem({
        itemCode: resolvedSkuCode,
        name: skuData?.itemName || resolvedName,
        category: skuData?.category || resolvedCategory,
        stationId: manifest.destination,
        unit: skuData?.unit || (["KG", "LITRE", "BOX", "PCS", "CYLINDER", "BAG", "SET"].includes(resolvedUnit) ? resolvedUnit : "PCS"),
        currentStock: 0,
        inTransitStock: 0,
        reservedStock: 0,
        minimumStock: skuData?.minStockLevel || 10,
        criticalStock: 5,
        skuId: skuData?._id || manifestItem?.skuId,
        status: "AVAILABLE"
      });
    }

    // Update stock levels
    inventoryItem.currentStock += qtyToReceive;
    inventoryItem.inTransitStock = Math.max(0, (inventoryItem.inTransitStock || 0) - qtyToReceive);

    if (inventoryItem.currentStock <= 0) {
      inventoryItem.status = "OUT_OF_STOCK";
    } else if (inventoryItem.currentStock <= inventoryItem.criticalStock) {
      inventoryItem.status = "CRITICAL";
    } else if (inventoryItem.currentStock <= inventoryItem.minimumStock) {
      inventoryItem.status = "LOW_STOCK";
    } else {
      inventoryItem.status = "AVAILABLE";
    }

    await inventoryItem.save();

    // Record Inventory Transaction
    await InventoryTransaction.create({
      eventId: crypto.randomUUID(),
      transactionNumber: `INV-${Date.now()}`,
      inventoryItemId: inventoryItem._id,
      stationId: manifest.destination,
      expeditionId: manifest.expeditionId,
      transactionType: "RECEIPT",
      quantity: qtyToReceive,
      balanceAfterTransaction: inventoryItem.currentStock,
      sourceManifestId: manifest._id,
      performedBy: req.user?.userId || req.user?._id,
      syncStatus: "SYNCED",
      remarks: remarks || `Cargo box received at destination station. Damaged: ${damagedQuantity}`
    });

    // Update manifest item status
    if (manifestItem) {
      manifestItem.status = "RECEIVED";
      const allReceived = manifest.items.every(it => it.status === "RECEIVED");
      if (allReceived) {
        manifest.status = "DELIVERED";
      } else {
        manifest.status = "IN_TRANSIT";
      }
      await manifest.save();
    }

    return res.status(200).json({
      success: true,
      message: `Cargo received successfully. ${qtyToReceive} units added to station inventory.`,
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