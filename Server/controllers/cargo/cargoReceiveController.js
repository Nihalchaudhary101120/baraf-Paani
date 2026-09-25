import mongoose from "mongoose";

import CargoManifest from "../../models/cargo-models/cargo-menifest.js";
import CargoCheckpoint from "../../models/cargo-models/cargo-checkpoint.js";

import InventoryItem from "../../models/inventory-models/inventory-item.js";
import InventoryTransaction from "../../models/inventory-models/inventory-transaction.js";


export const receiveCargo = async (req, res) => {

  const session = await mongoose.startSession();

  try {

    const {
      manifestId,
      itemCode,
      acceptedQuantity,
      damagedQuantity = 0,
      remarks
    } = req.body;

    await session.withTransaction(async () => {

      const manifest = await CargoManifest.findById(
        manifestId
      ).session(session);

      if (!manifest) {
        throw new Error("Manifest not found.");
      }

      const latestCheckpoint = await CargoCheckpoint.findOne({
        manifestId,
        itemCode
      })
      .sort({ createdAt: -1 })
      .session(session);

      if (!latestCheckpoint) {
        throw new Error("Item has never been scanned.");
      }

      if (latestCheckpoint.checkpoint.type !== "STATION") {
        throw new Error("Cargo has not reached station.");
      }

      const inventoryItem = await InventoryItem.findOne({
        itemCode,
        stationId: manifest.destination
      }).session(session);

      if (!inventoryItem) {
        throw new Error("Inventory item not found.");
      }

      inventoryItem.currentStock += acceptedQuantity;

      if (inventoryItem.currentStock <= 0) {
        inventoryItem.status = "OUT_OF_STOCK";
      } else if (
        inventoryItem.currentStock <= inventoryItem.criticalStock
      ) {
        inventoryItem.status = "CRITICAL";
      } else if (
        inventoryItem.currentStock <= inventoryItem.minimumStock
      ) {
        inventoryItem.status = "LOW_STOCK";
      } else {
        inventoryItem.status = "AVAILABLE";
      }

      await inventoryItem.save({ session });

      await InventoryTransaction.create([{

        eventId: crypto.randomUUID(),

        transactionNumber: `INV-${Date.now()}`,

        inventoryItemId: inventoryItem._id,

        stationId: manifest.destination,

        expeditionId: manifest.expeditionId,

        transactionType: "RECEIPT",

        quantity: acceptedQuantity,

        balanceAfterTransaction: inventoryItem.currentStock,

        sourceManifestId: manifest._id,

        performedBy: req.user.userId,

        syncStatus: "SYNCED",

        remarks

      }], { session });

    });

    return res.status(200).json({
      success: true,
      message: "Cargo received successfully."
    });

  } catch (error) {

    return res.status(400).json({
      success: false,
      message: error.message
    });

  } finally {

    session.endSession();

  }

};