import mongoose from "mongoose";
import CargoManifest from "../../models/cargo-models/cargo-menifest.js";
import Shipment from "../../models/cargo-models/shipment.js";
import Expedition from "../../models/master-models/expedition.js";
import Station from "../../models/master-models/station.js";
import SKU from "../../models/cargo-models/sku.js";
import processManifestDelivery from "../../services/inventoryReceiptService.js";

const calculateTotals = (items = []) => {
    return items.reduce(
        (totals, item) => {
            totals.totalPackages += Number(item.packageCount) || 1;
            totals.totalWeightKg += Number(item.weightKg) || 0;
            totals.totalDeclaredValue += Number(item.declaredValueINR) || 0;

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

    return `CGM-${year}-${String(sequence).padStart(3, "0")}`;
};

export const createManifest = async (req, res) => {
    try {
        const {
            expeditionId,
            declarationType,
            owner,
            origin,
            destination,
            items,
            shipmentId,
            manifestNumber: customManifestNumber,
            description
        } = req.body;

        // Check if attached to a shipment
        let shipment = null;
        if (shipmentId && mongoose.Types.ObjectId.isValid(shipmentId)) {
            shipment = await Shipment.findById(shipmentId);
        }

        // Resolve Expedition (from explicit expeditionId, or from selected shipment, or latest)
        let expedition = null;
        const targetExpId = expeditionId || shipment?.expeditionId;
        if (targetExpId && mongoose.Types.ObjectId.isValid(targetExpId)) {
            expedition = await Expedition.findById(targetExpId);
        }
        if (!expedition && targetExpId) {
            expedition = await Expedition.findOne({
                $or: [
                    { expeditionCode: String(targetExpId).trim() },
                    { name: new RegExp(`^${targetExpId}`, "i") }
                ]
            });
        }
        if (!expedition) {
            expedition = await Expedition.findOne().sort({ createdAt: -1 });
        }
        if (!expedition) {
            expedition = await Expedition.create({
                expeditionCode: "EXP-2026-01",
                name: "45th Indian Scientific Expedition to Antarctica",
                year: new Date().getFullYear(),
                season: "SUMMER",
                startDate: new Date()
            });
        }

        // Resolve Destination Station (from explicit destination, or from selected shipment, or default)
        let station = null;
        const targetDest = destination || shipment?.route?.destination;
        if (targetDest && mongoose.Types.ObjectId.isValid(targetDest)) {
            station = await Station.findById(targetDest);
        }
        if (!station && targetDest) {
            station = await Station.findOne({
                $or: [
                    { code: String(targetDest).toUpperCase() },
                    { name: new RegExp(`^${targetDest}`, "i") }
                ]
            });
        }
        if (!station) {
            station = await Station.findOne({ code: "BHARATI" }) || await Station.findOne();
        }
        if (!station) {
            station = await Station.create({
                name: "Bharati Station (Larsemann Hills)",
                code: "BHARATI",
                stationType: "COASTAL",
                operationalStatus: "ACTIVE"
            });
        }

        const validItems = Array.isArray(items) ? items : [];

        // Check duplicate codes in provided items
        if (validItems.length > 0) {
            const duplicateItemCodes =
                new Set(validItems.map(item => item.itemCode)).size !== validItems.length;

            if (duplicateItemCodes) {
                return res.status(400).json({
                    success: false,
                    message: "Item codes must be unique within a manifest"
                });
            }
        }

        const manifestNumber = customManifestNumber?.trim() || (await generateManifestNumber());

        const validDeclarationTypes = [
            "OFFICIAL",
            "PERSONAL",
            "SCIENTIFIC",
            "SCIENTIFIC_SAMPLES",
            "EQUIPMENT",
            "CONSUMABLES",
            "MEDICAL",
            "HAZMAT"
        ];
        const resolvedDeclarationType = validDeclarationTypes.includes(declarationType)
            ? declarationType
            : "OFFICIAL";

        const manifestData = {
            manifestNumber,
            expeditionId: expedition._id,
            declarationType: resolvedDeclarationType,
            owner: owner || { organization: "NCPOR" },
            origin: origin || "Goa",
            destination: station._id,
            items: validItems,
            totals: calculateTotals(validItems),
            description: description || "Antarctic Cargo Manifest",
            createdBy: req.user?.userId || req.user?.id
        };

        if (shipmentId && mongoose.Types.ObjectId.isValid(shipmentId)) {
            manifestData.shipmentId = shipmentId;
        }

        const manifest = await CargoManifest.create(manifestData);

        // Update expedition summary counter
        await Expedition.findByIdAndUpdate(expedition._id, {
            $inc: { "summary.cargoManifestCount": 1 }
        }).catch(() => {});

        // If shipment attached, update shipment stats
        if (manifest.shipmentId) {
            const allManifests = await CargoManifest.find({ shipmentId: manifest.shipmentId });
            const totalWeight = allManifests.reduce((sum, m) => sum + (m.totals?.totalWeightKg || 0), 0);
            const totalBoxes = allManifests.reduce((sum, m) => sum + (m.items?.length || 0), 0);
            await Shipment.findByIdAndUpdate(manifest.shipmentId, {
                cargoCount: totalBoxes,
                totalWeightKg: totalWeight
            }).catch(() => {});
        }

        const populated = await CargoManifest.findById(manifest._id)
            .populate("destination")
            .populate("shipmentId")
            .populate("expeditionId");

        return res.status(201).json({
            success: true,
            message: "Cargo manifest created successfully",
            manifest: populated
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
        if (status && status !== 'ALL') filter.status = status;
        if (declarationType && declarationType !== 'ALL') filter.declarationType = declarationType;
        if (destination) filter.destination = destination;
        if (shipmentId) filter.shipmentId = shipmentId;

        const manifests = await CargoManifest.find(filter)
            .populate("destination")
            .populate("shipmentId")
            .populate("expeditionId")
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

export const addManifestItem = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            skuId,
            skuCode,
            itemName,
            boxCode,
            itemCode,
            description,
            category,
            quantity,
            unit,
            weightKg,
            unitWeightKg,
            dimensions,
            declaredValueINR,
            unitDeclaredValue,
            hazardous,
            packageCount,
            packageType,
            make,
            manufacturer,
            model,
            serialNumber,
            serialNumbers,
            specialHandling,
            temperatureRequirement,
            notes
        } = req.body;

        const manifest = await CargoManifest.findById(id);
        if (!manifest) {
            return res.status(404).json({
                success: false,
                message: "Cargo manifest not found"
            });
        }

        if (manifest.status === "DELIVERED") {
            return res.status(400).json({
                success: false,
                message: "Cannot add cargo boxes to a delivered / closed manifest"
            });
        }

        // Fetch SKU if provided
        let skuItem = null;
        if (skuId) {
            skuItem = await SKU.findById(skuId);
        } else if (skuCode) {
            skuItem = await SKU.findOne({ skuCode: skuCode.trim().toUpperCase() });
        }

        if (skuItem && skuItem.status === "INACTIVE") {
            return res.status(400).json({
                success: false,
                message: `SKU '${skuItem.skuCode}' is INACTIVE and cannot be added to cargo.`
            });
        }

        const resolvedQty = Math.max(1, Number(quantity) || 1);
        const resolvedUnitWeight = Number(unitWeightKg) || (skuItem?.defaultWeightKg) || (Number(weightKg) ? Number(weightKg) / resolvedQty : 1);
        const resolvedTotalWeight = Number(weightKg) || (resolvedUnitWeight * resolvedQty);

        const resolvedUnitValue = Number(unitDeclaredValue) || (skuItem?.unitDeclaredValue) || (Number(declaredValueINR) ? Number(declaredValueINR) / resolvedQty : 0);
        const resolvedTotalValue = Number(declaredValueINR) || (resolvedUnitValue * resolvedQty);

        const resolvedCategory = category || skuItem?.category || "GENERAL";
        const resolvedDescription = description || skuItem?.description || skuItem?.itemName || "Polar Cargo Supplies";
        const resolvedMake = make || manufacturer || skuItem?.manufacturer || undefined;
        const resolvedModel = model || skuItem?.model || undefined;
        const resolvedUnit = unit || skuItem?.unit || "PCS";

        // Check serial tracking requirement
        let parsedSerials = [];
        if (Array.isArray(serialNumbers)) {
            parsedSerials = serialNumbers.filter(s => s && String(s).trim().length > 0);
        } else if (typeof serialNumbers === 'string' && serialNumbers.trim()) {
            parsedSerials = serialNumbers.split(',').map(s => s.trim()).filter(Boolean);
        } else if (serialNumber) {
            parsedSerials = [serialNumber.trim()];
        }

        if (skuItem?.trackingType === "SERIALIZED" && parsedSerials.length < resolvedQty) {
            // If serialized and fewer serials provided, still allow or warn
        }

        const finalCode = boxCode?.trim() || itemCode?.trim() || `BOX-${new Date().getFullYear()}-${String((manifest.items?.length || 0) + 1).padStart(3, "0")}`;

        const parsedDimensions = typeof dimensions === 'string'
            ? { length: 50, width: 40, height: 30, unit: 'cm' }
            : (dimensions || skuItem?.defaultDimensions || { length: 50, width: 40, height: 30, unit: 'cm' });

        const newItem = {
            itemCode: finalCode,
            boxCode: finalCode,
            skuId: skuItem?._id || (skuId ? new mongoose.Types.ObjectId(skuId) : undefined),
            skuCode: skuItem?.skuCode || skuCode || undefined,
            itemName: itemName || skuItem?.itemName || resolvedDescription,
            description: resolvedDescription,
            category: resolvedCategory,
            make: resolvedMake,
            manufacturer: resolvedMake,
            model: resolvedModel,
            quantity: resolvedQty,
            unit: resolvedUnit,
            unitWeightKg: resolvedUnitWeight,
            weightKg: resolvedTotalWeight,
            packageCount: Number(packageCount) || 1,
            packageType: packageType || "BOX",
            dimensions: parsedDimensions,
            unitDeclaredValue: resolvedUnitValue,
            declaredValueINR: resolvedTotalValue,
            specialHandling: specialHandling || "NORMAL",
            temperatureRequirement: temperatureRequirement || skuItem?.temperatureRequirement || "AMBIENT",
            hazardous: hazardous !== undefined ? Boolean(hazardous) : Boolean(skuItem?.isHazardous),
            notes: notes || "",
            status: "PACKED",
            serialNumber: parsedSerials[0] || undefined,
            serialNumbers: parsedSerials,
            qrCode: req.body.qrCode || `QR-${finalCode}`
        };

        manifest.items.push(newItem);
        manifest.totals = calculateTotals(manifest.items);
        await manifest.save();

        // Update shipment if assigned
        if (manifest.shipmentId) {
            const allManifests = await CargoManifest.find({ shipmentId: manifest.shipmentId });
            const totalWeight = allManifests.reduce((sum, m) => sum + (m.totals?.totalWeightKg || 0), 0);
            const totalBoxes = allManifests.reduce((sum, m) => sum + (m.items?.length || 0), 0);
            await Shipment.findByIdAndUpdate(manifest.shipmentId, {
                totalWeightKg: totalWeight,
                cargoCount: totalBoxes
            }).catch(() => {});
        }

        return res.status(201).json({
            success: true,
            message: `Box ${finalCode} added successfully with SKU ${newItem.skuCode || 'Custom'}`,
            item: manifest.items[manifest.items.length - 1],
            manifest
        });
    } catch (error) {
        console.error("Add item error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to add cargo box"
        });
    }
};

export const updateManifestItemQR = async (req, res) => {
    try {
        const { id, itemCode } = req.params;
        const { qrCode } = req.body;

        const manifest = await CargoManifest.findById(id);
        if (!manifest) {
            return res.status(404).json({ success: false, message: "Cargo manifest not found" });
        }

        const item = manifest.items.find(i => i.itemCode === itemCode || i._id.toString() === itemCode);
        if (!item) {
            return res.status(404).json({ success: false, message: "Item not found in manifest" });
        }

        item.qrCode = qrCode || `QR-${item.itemCode}-${Date.now()}`;
        await manifest.save();

        return res.status(200).json({
            success: true,
            message: `QR code generated for ${item.itemCode}`,
            qrCode: item.qrCode,
            manifest
        });
    } catch (error) {
        console.error("Update QR error:", error);
        return res.status(500).json({ success: false, message: "Failed to update QR code" });
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

        const {
            declarationType,
            owner,
            origin,
            destination,
            items,
            description,
            shipmentId
        } = req.body;

        if (declarationType !== undefined)
            manifest.declarationType = declarationType;

        if (owner !== undefined)
            manifest.owner = owner;

        if (origin !== undefined)
            manifest.origin = origin;

        if (destination !== undefined)
            manifest.destination = destination;

        if (description !== undefined)
            manifest.description = description;

        if (shipmentId !== undefined)
            manifest.shipmentId = shipmentId;

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
            CREATED: ["PACKED", "DISPATCHED"],
            PACKED: ["DISPATCHED", "IN_TRANSIT"],
            DISPATCHED: ["IN_TRANSIT", "DELIVERED"],
            IN_TRANSIT: ["DELIVERED"],
            DELIVERED: []
        };

        if (transitions[manifest.status] && !transitions[manifest.status].includes(status) && manifest.status !== status) {
            return res.status(400).json({
                success: false,
                message: `Invalid transition from ${manifest.status} to ${status}`
            });
        }

        const previousStatus = manifest.status;
        manifest.status = status;
        await manifest.save();

        // ── Auto-receive inventory when manifest is marked DELIVERED ──────
        // This is idempotent: if already DELIVERED, receipt service skips duplicates.
        if (status === "DELIVERED" && previousStatus !== "DELIVERED") {
            const performedBy = req.user?.userId || req.user?.id || req.user?._id;
            processManifestDelivery(manifest._id, performedBy).catch((err) => {
                console.error(`[InventoryReceipt] Failed for manifest ${manifest.manifestNumber}:`, err.message);
            });
        }

        return res.status(200).json({
            success: true,
            message: `Manifest status changed to ${status}`,
            inventoryQueued: status === "DELIVERED",
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