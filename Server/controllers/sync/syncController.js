import mongoose from "mongoose";

import CargoCheckpoint from "../../models/cargo-models/cargo-checkpoint.js";
import CargoManifest from "../../models/cargo-models/cargo-menifest.js";
import InventoryTransaction from "../../models/inventory-models/inventory-transaction.js";
import InventoryItem from "../../models/inventory-models/inventory-item.js";
import InventoryBatch from "../../models/inventory-models/inventory-batch.js";
import Station from "../../models/master-models/station.js";
import User from "../../models/master-models/user.js";
import SKU from "../../models/cargo-models/sku.js";
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

    // Resolve station
    let stationId = manifest.destination || event.stationId;
    if (!stationId || !mongoose.Types.ObjectId.isValid(stationId)) {
        const stationDoc = await Station.findOne({
            $or: [
                { code: String(stationId || "BHARATI").toUpperCase() },
                { name: new RegExp(`^${stationId || "Bharati"}`, "i") },
                { code: "BHARATI" }
            ]
        }).session(session) || await Station.findOne().session(session);
        stationId = stationDoc?._id;
    }

    // Resolve performedBy
    let performedBy = event.performedBy;
    if (!performedBy || !mongoose.Types.ObjectId.isValid(performedBy)) {
        const defaultUser = await User.findOne().session(session);
        performedBy = defaultUser?._id;
    }

    // Find cargo item
    const targetCode = String(event.boxCode || event.itemCode || "").trim();
    let manifestItem = manifest.items.find(
        i => (i.itemCode && i.itemCode.trim().toLowerCase() === targetCode.toLowerCase()) ||
             (i.boxCode && i.boxCode.trim().toLowerCase() === targetCode.toLowerCase()) ||
             (i.trackingCode && i.trackingCode.trim().toLowerCase() === targetCode.toLowerCase()) ||
             (i._id && i._id.toString() === targetCode)
    );

    if (!manifestItem && manifest.items.length === 1) {
        manifestItem = manifest.items[0];
    }

    const qtyToReceive = Number(event.acceptedQuantity) || 1;

    // Resolve SKU
    let skuDoc = null;
    if (manifestItem?.skuId && mongoose.Types.ObjectId.isValid(manifestItem.skuId)) {
        skuDoc = await SKU.findById(manifestItem.skuId).session(session).lean();
    } else if (manifestItem?.skuCode) {
        skuDoc = await SKU.findOne({ skuCode: manifestItem.skuCode.toUpperCase().trim() }).session(session).lean();
    }

    const skuId = skuDoc?._id || (manifestItem?.skuId && mongoose.Types.ObjectId.isValid(manifestItem.skuId) ? manifestItem.skuId : null);
    const skuCode = (skuDoc?.skuCode || manifestItem?.skuCode || manifestItem?.itemCode || targetCode || "GENERAL").toUpperCase().trim();
    const itemName = manifestItem?.itemName || skuDoc?.itemName || manifestItem?.description || skuCode;

    const rawCategory = (manifestItem?.category || skuDoc?.category || "GENERAL").toUpperCase().trim();
    const rawUnit = (manifestItem?.unit || skuDoc?.unit || "PCS").toUpperCase().trim();

    const ALLOWED_ITEM_CATEGORIES = ["FOOD", "FUEL", "MEDICAL", "SCIENTIFIC", "SPARES", "ELECTRONICS", "SAFETY", "GENERAL"];
    const itemCategory = ALLOWED_ITEM_CATEGORIES.includes(rawCategory) ? rawCategory : "GENERAL";

    const ALLOWED_BATCH_CATEGORIES = ["FOOD", "FUEL", "MEDICAL", "SCIENTIFIC", "PERSONAL", "SPARES", "ELECTRONICS", "EQUIPMENT", "SAFETY", "GENERAL"];
    const batchCategory = ALLOWED_BATCH_CATEGORIES.includes(rawCategory) ? rawCategory : "GENERAL";

    const ALLOWED_ITEM_UNITS = ["KG", "LITRE", "BOX", "PCS", "CYLINDER", "BAG", "SET"];
    const itemUnit = ALLOWED_ITEM_UNITS.includes(rawUnit) ? rawUnit : "PCS";

    // Create InventoryBatch (idempotent)
    const cargoItemId = (manifestItem?._id && mongoose.Types.ObjectId.isValid(manifestItem._id))
        ? manifestItem._id
        : new mongoose.Types.ObjectId();

    let batch = await InventoryBatch.findOne({
        stationId,
        sourceManifestId: manifest._id,
        sourceCargoItemId: cargoItemId
    }).session(session);

    let batchIsNew = false;
    if (!batch) {
        try {
            const created = await InventoryBatch.create(
                [{
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
                }],
                { session }
            );
            batch = created[0];
            batchIsNew = true;
        } catch (dupErr) {
            if (dupErr.code === 11000) {
                batch = await InventoryBatch.findOne({
                    stationId,
                    sourceManifestId: manifest._id,
                    sourceCargoItemId: cargoItemId
                }).session(session);
                batchIsNew = false;
            } else {
                throw dupErr;
            }
        }
    }

    // Upsert InventoryItem
    let item = null;
    if (skuId) {
        item = await InventoryItem.findOne({ stationId, skuId }).session(session);
    }
    if (!item) {
        item = await InventoryItem.findOne({ stationId, itemCode: skuCode }).session(session);
    }
    if (!item) {
        item = await InventoryItem.findOne({ itemCode: skuCode }).session(session);
    }

    if (!item) {
        try {
            const createdItem = await InventoryItem.create(
                [{
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
                }],
                { session }
            );
            item = createdItem[0];
        } catch (itemErr) {
            if (itemErr.code === 11000) {
                item = await InventoryItem.findOne({ itemCode: skuCode }).session(session);
            } else {
                throw itemErr;
            }
        }
    }

    if (batchIsNew) {
        item.currentStock += qtyToReceive;

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
                    stationId,
                    expeditionId: (manifest.expeditionId && mongoose.Types.ObjectId.isValid(manifest.expeditionId)) ? manifest.expeditionId : undefined,
                    skuId: skuId || undefined,
                    skuCode,
                    transactionType: "RECEIPT",
                    quantity: qtyToReceive,
                    balanceAfterTransaction: item.currentStock,
                    sourceManifestId: event.manifestId,
                    sourceManifestNumber: manifest.manifestNumber,
                    performedBy,
                    deviceId: event.deviceId,
                    offlineCreated: true,
                    syncStatus: "SYNCED",
                    remarks: event.remarks || `Cargo synced from manifest ${manifest.manifestNumber}`
                }
            ],
            { session }
        );
    }

    // Update manifest item status
    if (manifestItem) {
        manifestItem.status = "RECEIVED";
        const allReceived = manifest.items.every(it => it.status === "RECEIVED");
        if (allReceived && manifest.status !== "DELIVERED") {
            manifest.status = "DELIVERED";
        }
        await manifest.save({ session });
    }
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

