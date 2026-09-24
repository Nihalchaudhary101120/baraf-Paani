import mongoose from "mongoose";

import CargoCheckpoint from "../../models/cargo-models/cargo-checkpoint.js";
import InventoryTransaction from "../../models/inventory-models/inventory-transaction.js";
import InventoryItem from "../../models/inventory-models/inventory-item.js";





export const syncOfflineEvents = async (req, res) => {
  try {
    const { events } = req.body;

    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Events array is required."
      });
    }

    const synced = [];
    const skipped = [];
    const failed = [];

    for (const event of events) {
      try {

        let alreadyExists = false;

        if (event.type === "CHECKPOINT_SCAN") {
          alreadyExists = await CargoCheckpoint.exists({
            eventId: event.eventId
          });
        }

        if (event.type === "INVENTORY_CONSUMPTION") {
          alreadyExists = await InventoryTransaction.exists({
            eventId: event.eventId
          });
        }

        if (alreadyExists) {
          skipped.push({
            eventId: event.eventId,
            reason: "Already synced"
          });
          continue;
        }

        synced.push({
          eventId: event.eventId,
          type: event.type
        });

      } catch (error) {
        failed.push({
          eventId: event.eventId,
          reason: error.message
        });
      }
    }

    return res.status(200).json({
      success: true,
      summary: {
        received: events.length,
        synced: synced.length,
        skipped: skipped.length,
        failed: failed.length
      },
      synced,
      skipped,
      failed
    });
    

  } catch (error) {

    console.error("Offline sync error:", error);

    return res.status(500).json({
      success: false,
      message: "Offline synchronization failed."
    });

  }
};

