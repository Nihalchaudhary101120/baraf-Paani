import mongoose from "mongoose";

import CargoCheckpoint from "../../models/cargo-models/cargo-checkpoint.js";
import CargoManifest from "../../models/cargo-models/cargo-menifest.js";
import InventoryTransaction from "../../models/inventory-models/inventory-transaction.js";
import InventoryItem from "../../models/inventory-models/inventory-item.js";
import ExcursionEquipment from "../../models/field-operation-models/excursionEquipment.js";
import processFieldCheckIn from "../fieldSyncController/processFieldCheckIn.js";
import processSOS from "../fieldSyncController/processSos.js";
import processExcursionStart from "../fieldSyncController/processExcursionStart.js";
import processExcursionEnd from "../fieldSyncController/processExcursionEnd.js";
import processEquipmentReturn from "../fieldSyncController/processEquipmentReturn.js";

const processCheckpointScan = async (event, session) => {
    await CargoCheckpoint.create(
        [
            {
                eventId: event.eventId,
                manifestId: event.manifestId,
                shipmentId: event.shipmentId,
                itemCode: event.itemCode,
                checkpoint: event.checkpoint,
                scannedQuantity: event.scannedQuantity,
                condition: event.condition ?? "GOOD",
                scannedBy: event.scannedBy,
                deviceId: event.deviceId,
                offlineCreated: true,
                syncStatus: "SYNCED",
                remarks: event.remarks
            }
        ],
        { session }
    );
};

const processConsumption = async (event, session) => {
    const item = await InventoryItem.findById(event.inventoryItemId).session(session);

    if (!item) {
        throw new Error("Inventory item not found.");
    }

    if (item.currentStock < event.quantity) {
        throw new Error("Insufficient stock.");
    }

    item.currentStock -= event.quantity;

    if (item.currentStock <= 0) {
        item.status = "OUT_OF_STOCK";
    } else if (item.currentStock <= item.criticalStock) {
        item.status = "CRITICAL";
    } else if (item.currentStock <= item.minimumStock) {
        item.status = "LOW_STOCK";
    } else {
        item.status = "AVAILABLE";
    }

    await item.save({ session });

    await InventoryTransaction.create(
        [
            {
                eventId: event.eventId,
                transactionNumber: `INV-${Date.now()}`,
                inventoryItemId: item._id,
                stationId: event.stationId,
                expeditionId: event.expeditionId,
                transactionType: "CONSUMPTION",
                quantity: event.quantity,
                balanceAfterTransaction: item.currentStock,
                performedBy: event.performedBy,
                deviceId: event.deviceId,
                offlineCreated: true,
                syncStatus: "SYNCED",
                remarks: event.remarks
            }
        ],
        { session }
    );
};

const processCargoReceive = async (event, session) => {
    const manifest = await CargoManifest.findById(event.manifestId).session(session);

    if (!manifest) {
        throw new Error("Manifest not found.");
    }

    const latestCheckpoint = await CargoCheckpoint.findOne({
        manifestId: event.manifestId,
        itemCode: event.itemCode
    })
        .sort({ createdAt: -1 })
        .session(session);

    if (!latestCheckpoint) {
        throw new Error("Cargo has not been scanned.");
    }

    if (latestCheckpoint.checkpoint.type !== "STATION") {
        throw new Error("Cargo has not reached destination station.");
    }

    const item = await InventoryItem.findOne({
        itemCode: event.itemCode,
        stationId: event.stationId
    }).session(session);

    if (!item) {
        throw new Error("Inventory item not found.");
    }

    item.currentStock += event.acceptedQuantity;

    if (item.currentStock <= 0) {
        item.status = "OUT_OF_STOCK";
    } else if (item.currentStock <= item.criticalStock) {
        item.status = "CRITICAL";
    } else if (item.currentStock <= item.minimumStock) {
        item.status = "LOW_STOCK";
    } else {
        item.status = "AVAILABLE";
    }

    await item.save({ session });

    await InventoryTransaction.create(
        [
            {
                eventId: event.eventId,
                transactionNumber: `INV-${Date.now()}`,
                inventoryItemId: item._id,
                stationId: event.stationId,
                expeditionId: manifest.expeditionId,
                transactionType: "RECEIPT",
                quantity: event.acceptedQuantity,
                balanceAfterTransaction: item.currentStock,
                sourceManifestId: event.manifestId,
                performedBy: event.performedBy,
                deviceId: event.deviceId,
                offlineCreated: true,
                syncStatus: "SYNCED",
                remarks: event.remarks
            }
        ],
        { session }
    );
};

const processEquipmentIssue = async (event, session) => {
    // Prevent duplicate
    const existing = await ExcursionEquipment.findOne({
        eventId: event.eventId
    }).session(session);

    if (existing) return existing;

    const item = await InventoryItem.findById(event.inventoryItemId).session(session);

    if (!item) throw new Error("Inventory item not found.");

    if (item.currentStock < event.quantityIssued) {
        throw new Error("Insufficient stock for equipment issue.");
    }

    item.currentStock -= event.quantityIssued;

    if (item.currentStock <= 0) {
        item.status = "OUT_OF_STOCK";
    } else if (item.currentStock <= item.criticalStock) {
        item.status = "CRITICAL";
    } else if (item.currentStock <= item.minimumStock) {
        item.status = "LOW_STOCK";
    } else {
        item.status = "AVAILABLE";
    }

    await item.save({ session });

    await ExcursionEquipment.create(
        [{
            eventId: event.eventId,
            excursionId: event.excursionId,
            inventoryItemId: event.inventoryItemId,
            itemName: event.itemName,
            quantityIssued: event.quantityIssued,
            quantityReturned: 0,
            issuedAt: event.issuedAt || new Date(),
            issuedBy: event.performedBy,
            deviceId: event.deviceId,
            offlineCreated: true,
            syncStatus: "SYNCED"
        }],
        { session }
    );

    await InventoryTransaction.create(
        [{
            eventId: `${event.eventId}-checkout`,
            transactionNumber: `CHK-${Date.now()}`,
            inventoryItemId: item._id,
            stationId: event.stationId,
            expeditionId: event.expeditionId,
            transactionType: "CHECKOUT",
            quantity: event.quantityIssued,
            balanceAfterTransaction: item.currentStock,
            performedBy: event.performedBy,
            deviceId: event.deviceId,
            offlineCreated: true,
            syncStatus: "SYNCED",
            remarks: event.remarks
        }],
        { session }
    );
};

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
            const session = await mongoose.startSession();

            try {
                let alreadyExists = false;

                if (event.type === "CHECKPOINT_SCAN") {
                    alreadyExists = await CargoCheckpoint.exists({
                        eventId: event.eventId
                    });
                } else {
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

                await session.withTransaction(async () => {
                    switch (event.type) {
                        case "CHECKPOINT_SCAN":
                            await processCheckpointScan(event, session);
                            break;

                        case "CARGO_RECEIVE":
                            await processCargoReceive(event, session);
                            break;

                        case "INVENTORY_CONSUMPTION":
                            await processConsumption(event, session);
                            break;

                        case "EXCURSION_START":
                            await processExcursionStart(event, session);
                            break;

                        case "FIELD_CHECKIN":
                            await processFieldCheckIn(event, session);
                            break;

                        case "SOS_ALERT":
                            await processSOS(event, session);
                            break;

                        case "EXCURSION_END":
                            await processExcursionEnd(event, session);
                            break;

                        case "EQUIPMENT_ISSUE":
                            await processEquipmentIssue(event, session);
                            break;
                            
                        case "EQUIPMENT_RETURN":
                            await processEquipmentReturn(event, session);
                            break;


                        default:
                            throw new Error(`Unknown event type: ${event.type}`);
                    }
                });

                synced.push({
                    eventId: event.eventId,
                    type: event.type
                });
            } catch (error) {
                failed.push({
                    eventId: event.eventId,
                    reason: error.message
                });
            } finally {
                await session.endSession();
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
        console.error("Sync Error:", error);

        return res.status(500).json({
            success: false,
            message: "Offline synchronization failed."
        });
    }
};

