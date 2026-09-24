import CargoCheckpoint from "../../models/cargo-models/cargo-checkpoint.js";
import CargoManifest from "../../models/cargo-models/cargo-menifest.js";

export const createCheckpoint = async (req, res) => {
    try {
        const {
            manifestId,
            shipmentId,
            itemCode,
            checkpoint,
            scannedQuantity,
            condition,
            deviceId,
            offlineCreated,
            remarks
        } = req.body;

        if (!manifestId || !itemCode || !checkpoint?.name) {
            return res.status(400).json({
                success: false,
                message:
                    "Manifest, item code and checkpoint name are required"
            });
        }

        const manifest = await CargoManifest.findById(manifestId);

        if (!manifest) {
            return res.status(404).json({
                success: false,
                message: "Cargo manifest not found"
            });
        }

        const item = manifest.items.find(
            item => item.itemCode === itemCode
        );

        if (!item) {
            return res.status(404).json({
                success: false,
                message: "Cargo item not found in this manifest"
            });
        }

        if (
            shipmentId &&
            manifest.shipmentId &&
            manifest.shipmentId.toString() !== shipmentId
        ) {
            return res.status(400).json({
                success: false,
                message: "Shipment does not match manifest shipment"
            });
        }

        if (
            scannedQuantity !== undefined &&
            (
                scannedQuantity <= 0 ||
                scannedQuantity > item.packageCount
            )
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid scanned quantity"
            });
        }

        const cargoCheckpoint = await CargoCheckpoint.create({
            manifestId,
            shipmentId: shipmentId || manifest.shipmentId,
            itemCode,
            checkpoint,
            scannedQuantity:
                scannedQuantity ?? item.packageCount,
            condition,
            scannedBy: req.user.userId,
            deviceId,
            offlineCreated: offlineCreated ?? false,
            syncStatus: offlineCreated ? "PENDING" : "SYNCED",
            remarks
        });

        if (
            ["DISPATCHED"].includes(manifest.status)
        ) {
            manifest.status = "IN_TRANSIT";
            await manifest.save();
        }

        return res.status(201).json({
            success: true,
            message: "Cargo checkpoint recorded successfully",
            checkpoint: cargoCheckpoint
        });
    } catch (error) {
        console.error("Create checkpoint error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to record cargo checkpoint"
        });
    }
};

export const getManifestCheckpoints = async (req, res) => {
    try {
        const checkpoints = await CargoCheckpoint.find({
            manifestId: req.params.manifestId
        })
            .populate("scannedBy", "name employeeId role")
            .sort({ createdAt: 1 });

        return res.status(200).json({
            success: true,
            count: checkpoints.length,
            checkpoints
        });
    } catch (error) {
        console.error("Get checkpoints error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch cargo checkpoints"
        });
    }
};

export const getItemTracking = async (req, res) => {
    try {
        const { manifestId, itemCode } = req.params;

        const manifest = await CargoManifest.findById(
            manifestId
        ).populate("destination");

        if (!manifest) {
            return res.status(404).json({
                success: false,
                message: "Cargo manifest not found"
            });
        }

        const item = manifest.items.find(
            item => item.itemCode === itemCode
        );

        if (!item) {
            return res.status(404).json({
                success: false,
                message: "Cargo item not found"
            });
        }

        const checkpoints = await CargoCheckpoint.find({
            manifestId,
            itemCode
        })
            .populate("scannedBy", "name employeeId role")
            .sort({ createdAt: 1 });

        return res.status(200).json({
            success: true,
            item,
            currentStatus: manifest.status,
            latestCheckpoint:
                checkpoints[checkpoints.length - 1] || null,
            timeline: checkpoints
        });
    } catch (error) {
        console.error("Track cargo error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to track cargo"
        });
    }
};

export const getLatestCheckpoint = async (req, res) => {
    try {
        const { manifestId, itemCode } = req.params;

        const checkpoint = await CargoCheckpoint.findOne({
            manifestId,
            itemCode
        })
            .sort({ createdAt: -1 })
            .populate("scannedBy", "name employeeId role");

        return res.status(200).json({
            success: true,
            checkpoint
        });
    } catch (error) {
        console.error("Latest checkpoint error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch latest checkpoint"
        });
    }
};

export const syncOfflineCheckpoints = async (req, res) => {
    try {
        const { checkpoints } = req.body;

        if (!Array.isArray(checkpoints) || !checkpoints.length) {
            return res.status(400).json({
                success: false,
                message: "Checkpoints are required"
            });
        }

        const synced = [];
        const failed = [];

        for (const data of checkpoints) {
            try {
                const manifest =
                    await CargoManifest.findById(data.manifestId);

                if (!manifest) {
                    failed.push({
                        localId: data.localId,
                        reason: "Manifest not found"
                    });

                    continue;
                }

                const item = manifest.items.find(
                    item => item.itemCode === data.itemCode
                );

                if (!item) {
                    failed.push({
                        localId: data.localId,
                        reason: "Item not found"
                    });

                    continue;
                }

                const checkpoint =
                    await CargoCheckpoint.create({
                        manifestId: data.manifestId,
                        shipmentId:
                            data.shipmentId ||
                            manifest.shipmentId,
                        itemCode: data.itemCode,
                        checkpoint: data.checkpoint,
                        scannedQuantity:
                            data.scannedQuantity,
                        condition: data.condition,
                        scannedBy: req.user.userId,
                        deviceId: data.deviceId,
                        offlineCreated: true,
                        syncStatus: "SYNCED",
                        remarks: data.remarks,
                        createdAt:
                            data.createdAt || new Date()
                    });

                synced.push({
                    localId: data.localId,
                    serverId: checkpoint._id
                });
            } catch (error) {
                failed.push({
                    localId: data.localId,
                    reason: error.message
                });
            }
        }

        return res.status(200).json({
            success: true,
            synced,
            failed
        });
    } catch (error) {
        console.error("Checkpoint sync error:", error);

        return res.status(500).json({
            success: false,
            message: "Checkpoint synchronization failed"
        });
    }
};