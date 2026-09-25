import mongoose from "mongoose";
import CargoManifest from "../../models/cargo-models/cargo-menifest.js";
import Expedition from "../../models/master-models/expedition.js";
import Station from "../../models/master-models/station.js";

const calculateTotals = (items = []) => {
    return items.reduce(
        (totals, item) => {
            totals.totalPackages += item.packageCount || 1;
            totals.totalWeightKg +=
                (item.weightKg || 0) * (item.packageCount || 1);
            totals.totalDeclaredValue += item.declaredValueINR || 0;

            return totals;
        },
        {
            totalPackages: 0,
            totalWeightKg: 0,
            totalDeclaredValue: 0
        }
    );
};

const generateManifestNumber = async () => {
    const year = new Date().getFullYear();

    const lastManifest = await CargoManifest.findOne({
        manifestNumber: new RegExp(`^CGM-${year}-`)
    })
        .sort({ manifestNumber: -1 })
        .select("manifestNumber");

    let sequence = 1;
    if (lastManifest) {
        sequence = Number(lastManifest.manifestNumber.split("-").pop()) + 1;
    }

    return `CGM-${year}-${String(sequence).padStart(5, "0")}`;
};

export const createManifest = async (req, res) => {
    try {
        const {
            expeditionId,
            declarationType,
            owner,
            origin,
            destination,
            items
        } = req.body;

        if (
            !expeditionId ||
            !declarationType ||
            !destination ||
            !items?.length
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Expedition, declaration type, destination and items are required"
            });
        }

        const expedition = await Expedition.findById(expeditionId);

        if (!expedition) {
            return res.status(404).json({
                success: false,
                message: "Expedition not found"
            });
        }

        let station = null;
        if (mongoose.Types.ObjectId.isValid(destination)) {
            station = await Station.findById(destination);
        }
        if (!station) {
            station = await Station.findOne({ code: String(destination).toUpperCase() }) ||
                      await Station.findOne({ name: new RegExp(`^${destination}$`, "i") });
        }

        if (!station) {
            return res.status(404).json({
                success: false,
                message: "Destination station not found"
            });
        }

        const duplicateItemCodes =
            new Set(items.map(item => item.itemCode)).size !== items.length;

        if (duplicateItemCodes) {
            return res.status(400).json({
                success: false,
                message: "Item codes must be unique within a manifest"
            });
        }

        const manifestNumber = await generateManifestNumber();

        const manifest = await CargoManifest.create({
            manifestNumber,
            expeditionId: expedition._id,
            declarationType,
            owner,
            origin: origin || "Goa",
            destination: station._id,
            items,
            totals: calculateTotals(items),
            createdBy: req.user?.userId || req.user?.id
        });

        // Update expedition summary counter
        await Expedition.findByIdAndUpdate(expedition._id, {
            $inc: { "summary.cargoManifestCount": 1 }
        }).catch(() => {});

        return res.status(201).json({
            success: true,
            message: "Cargo manifest created successfully",
            manifest
        });
    } catch (error) {
        console.error("Create manifest error:", error);

        return res.status(500).json({
            success: false,
            message: error.message || "Failed to create cargo manifest"
        });
    }
};

export const getManifest = async (req, res) => {
    try {
        const manifest = await CargoManifest.findById(req.params.id)
            .populate("expeditionId")
            .populate("destination")
            .populate("shipmentId")
            .populate("owner.personnelId")
            .populate("createdBy", "name employeeId role");

        if (!manifest) {
            return res.status(404).json({
                success: false,
                message: "Cargo manifest not found"
            });
        }

        return res.status(200).json({
            success: true,
            manifest
        });
    } catch (error) {
        console.error("Get manifest error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch cargo manifest"
        });
    }
};

export const getManifests = async (req, res) => {
    try {
        const {
            expeditionId,
            status,
            declarationType,
            destination,
            shipmentId
        } = req.query;

        const filter = {};

        if (expeditionId) filter.expeditionId = expeditionId;
        if (status) filter.status = status;
        if (declarationType) filter.declarationType = declarationType;
        if (destination) filter.destination = destination;
        if (shipmentId) filter.shipmentId = shipmentId;

        const manifests = await CargoManifest.find(filter)
            .populate("destination")
            .populate("shipmentId")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: manifests.length,
            manifests
        });
    } catch (error) {
        console.error("Get manifests error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch cargo manifests"
        });
    }
};

export const updateManifest = async (req, res) => {
    try {
        const manifest = await CargoManifest.findById(req.params.id);

        if (!manifest) {
            return res.status(404).json({
                success: false,
                message: "Cargo manifest not found"
            });
        }

        if (!["CREATED", "PACKED"].includes(manifest.status)) {
            return res.status(400).json({
                success: false,
                message: "Manifest can no longer be edited"
            });
        }

        const {
            declarationType,
            owner,
            origin,
            destination,
            items
        } = req.body;

        if (declarationType !== undefined)
            manifest.declarationType = declarationType;

        if (owner !== undefined)
            manifest.owner = owner;

        if (origin !== undefined)
            manifest.origin = origin;

        if (destination !== undefined)
            manifest.destination = destination;

        if (items !== undefined) {
            manifest.items = items;
            manifest.totals = calculateTotals(items);
        }

        await manifest.save();

        return res.status(200).json({
            success: true,
            message: "Cargo manifest updated successfully",
            manifest
        });
    } catch (error) {
        console.error("Update manifest error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to update cargo manifest"
        });
    }
};

export const updateManifestStatus = async (req, res) => {
    try {
        const { status } = req.body;

        const manifest = await CargoManifest.findById(req.params.id);

        if (!manifest) {
            return res.status(404).json({
                success: false,
                message: "Cargo manifest not found"
            });
        }

        const transitions = {
            CREATED: ["PACKED"],
            PACKED: ["DISPATCHED"],
            DISPATCHED: ["IN_TRANSIT"],
            IN_TRANSIT: ["DELIVERED"],
            DELIVERED: []
        };

        if (!transitions[manifest.status]?.includes(status)) {
            return res.status(400).json({
                success: false,
                message:
                    `Invalid transition from ${manifest.status} to ${status}`
            });
        }

        if (
            ["DISPATCHED", "IN_TRANSIT"].includes(status) &&
            !manifest.shipmentId
        ) {
            return res.status(400).json({
                success: false,
                message: "Manifest must be assigned to a shipment first"
            });
        }

        manifest.status = status;

        await manifest.save();

        return res.status(200).json({
            success: true,
            message: `Manifest status changed to ${status}`,
            manifest
        });
    } catch (error) {
        console.error("Update manifest status error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to update manifest status"
        });
    }
};