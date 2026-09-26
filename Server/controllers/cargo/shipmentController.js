import mongoose from "mongoose";
import Shipment from "../../models/cargo-models/shipment.js";
import CargoManifest from "../../models/cargo-models/cargo-menifest.js";
import Expedition from "../../models/master-models/expedition.js";
import Transport from "../../models/master-models/transport.js";
import Station from "../../models/master-models/station.js";

const generateShipmentNumber = async () => {
    const year = new Date().getFullYear();

    const lastShipment = await Shipment.findOne({
        shipmentNumber: new RegExp(`^SHP-${year}-`)
    })
        .sort({ shipmentNumber: -1 })
        .select("shipmentNumber");

    let sequence = 1;

    if (lastShipment) {
        sequence =
            Number(lastShipment.shipmentNumber.split("-").pop()) + 1;
    }

    return `SHP-${year}-${String(sequence).padStart(3, "0")}`;
};

export const createShipment = async (req, res) => {
    try {
        const {
            expeditionId,
            transportId,
            route,
            origin,
            destination,
            vessel,
            vesselName,
            departureDate,
            estimatedArrival,
            eta,
            description,
            shipmentNumber: customShipmentNumber
        } = req.body;

        // Resolve Expedition
        let expedition = null;
        if (expeditionId && mongoose.Types.ObjectId.isValid(expeditionId)) {
            expedition = await Expedition.findById(expeditionId);
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

        // Resolve Transport
        const shipName = vessel || vesselName || "MV Bharati Express";
        let transport = null;
        if (transportId && mongoose.Types.ObjectId.isValid(transportId)) {
            transport = await Transport.findById(transportId);
        }
        if (!transport) {
            transport = await Transport.findOne({ name: shipName });
        }
        if (!transport) {
            transport = await Transport.findOne({ type: "SHIP" });
        }
        if (!transport) {
            transport = await Transport.create({
                name: shipName,
                code: "VESSEL-" + Date.now().toString().slice(-4),
                type: "SHIP",
                capacityKg: 50000,
                status: "AVAILABLE"
            });
        }

        // Resolve Route & Destination Station
        let destStation = null;
        const destInput = destination || route?.destination;
        if (destInput && mongoose.Types.ObjectId.isValid(destInput)) {
            destStation = await Station.findById(destInput);
        }
        if (!destStation && destInput) {
            destStation = await Station.findOne({
                $or: [
                    { code: String(destInput).toUpperCase() },
                    { name: new RegExp(`^${destInput}`, "i") }
                ]
            });
        }
        if (!destStation) {
            destStation = await Station.findOne({ code: "BHARATI" }) || await Station.findOne();
        }
        if (!destStation) {
            destStation = await Station.create({
                name: "Bharati Station (Larsemann Hills)",
                code: "BHARATI",
                stationType: "COASTAL",
                operationalStatus: "ACTIVE"
            });
        }

        const resolvedRoute = {
            origin: origin || route?.origin || "Goa",
            transitPoints: route?.transitPoints || [],
            destination: destStation._id
        };

        const finalShipmentNumber = customShipmentNumber?.trim() || (await generateShipmentNumber());

        const departure = departureDate ? new Date(departureDate) : new Date();
        const arrival = estimatedArrival || eta ? new Date(estimatedArrival || eta) : new Date(departure.getTime() + 65 * 24 * 60 * 60 * 1000);

        const shipment = await Shipment.create({
            shipmentNumber: finalShipmentNumber,
            expeditionId: expedition._id,
            transportId: transport._id,
            route: resolvedRoute,
            departureDate: departure,
            estimatedArrival: arrival,
            description: description || "Antarctic Expedition Supplies",
            vesselName: transport.name,
            status: "SCHEDULED"
        });

        const populated = await Shipment.findById(shipment._id)
            .populate("transportId")
            .populate("route.destination")
            .populate("expeditionId");

        return res.status(201).json({
            success: true,
            message: "Shipment created successfully",
            shipment: populated
        });
    } catch (error) {
        console.error("Create shipment error:", error);

        return res.status(500).json({
            success: false,
            message: error.message || "Failed to create shipment"
        });
    }
};

export const getShipment = async (req, res) => {
    try {
        const shipment = await Shipment.findById(req.params.id)
            .populate("expeditionId")
            .populate("transportId")
            .populate("route.destination");

        if (!shipment) {
            return res.status(404).json({
                success: false,
                message: "Shipment not found"
            });
        }

        const manifests = await CargoManifest.find({
            shipmentId: shipment._id
        }).select(
            "manifestNumber declarationType items totals status destination description"
        );

        return res.status(200).json({
            success: true,
            shipment,
            manifests
        });
    } catch (error) {
        console.error("Get shipment error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch shipment"
        });
    }
};

export const getShipments = async (req, res) => {
    try {
        const { expeditionId, status, transportId } = req.query;

        const filter = {};

        if (expeditionId) filter.expeditionId = expeditionId;
        if (status && status !== 'ALL') filter.status = status;
        if (transportId) filter.transportId = transportId;

        const shipments = await Shipment.find(filter)
            .populate("transportId")
            .populate("route.destination")
            .populate("expeditionId")
            .sort({ createdAt: -1 })
            .lean();

        // Dynamically compute manifest count and boxes from live manifests
        const shipmentIds = shipments.map(s => s._id);
        const manifests = await CargoManifest.find({ shipmentId: { $in: shipmentIds } }).select("shipmentId items totals status").lean();

        const enrichedShipments = shipments.map(s => {
            const relManifests = manifests.filter(m => m.shipmentId && m.shipmentId.toString() === s._id.toString());
            const totalBoxes = relManifests.reduce((sum, m) => sum + (m.items?.length || 0), 0);
            const totalWeight = relManifests.reduce((sum, m) => sum + (m.totals?.totalWeightKg || 0), 0);

            return {
                ...s,
                manifestCount: relManifests.length,
                totalBoxes: totalBoxes || s.cargoCount || 0,
                totalWeightKg: totalWeight || s.totalWeightKg || 0,
                vessel: s.vesselName || s.transportId?.name || "MV Bharati Express",
                origin: s.route?.origin || "Goa",
                destination: s.route?.destination?.name || s.route?.destination?.code || "Bharati"
            };
        });

        return res.status(200).json({
            success: true,
            count: enrichedShipments.length,
            shipments: enrichedShipments
        });
    } catch (error) {
        console.error("Get shipments error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch shipments"
        });
    }
};

export const assignManifestToShipment = async (req, res) => {
    try {
        const { shipmentId, manifestId } = req.params;

        const shipment = await Shipment.findById(shipmentId);

        if (!shipment) {
            return res.status(404).json({
                success: false,
                message: "Shipment not found"
            });
        }

        const manifest = await CargoManifest.findById(manifestId);

        if (!manifest) {
            return res.status(404).json({
                success: false,
                message: "Cargo manifest not found"
            });
        }

        if (manifest.shipmentId) {
            return res.status(409).json({
                success: false,
                message: "Manifest is already assigned to a shipment"
            });
        }

        if (!["CREATED", "PACKED"].includes(manifest.status)) {
            return res.status(400).json({
                success: false,
                message: "Manifest cannot be assigned in its current state"
            });
        }

        if (
            manifest.expeditionId.toString() !==
            shipment.expeditionId.toString()
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Manifest and shipment belong to different expeditions"
            });
        }

        manifest.shipmentId = shipment._id;

        await manifest.save();

        const manifests = await CargoManifest.find({
            shipmentId: shipment._id
        });

        shipment.cargoCount = manifests.length;

        shipment.totalWeightKg = manifests.reduce(
            (sum, cargo) =>
                sum + (cargo.totals?.totalWeightKg || 0),
            0
        );

        await shipment.save();

        return res.status(200).json({
            success: true,
            message: "Manifest assigned to shipment successfully",
            shipment,
            manifest
        });
    } catch (error) {
        console.error("Assign manifest error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to assign manifest"
        });
    }
};

export const updateShipmentStatus = async (req, res) => {
    try {
        const { status } = req.body;

        const shipment = await Shipment.findById(req.params.id);

        if (!shipment) {
            return res.status(404).json({
                success: false,
                message: "Shipment not found"
            });
        }

        const transitions = {
            SCHEDULED: ["LOADING"],
            LOADING: ["AT_SEA"],
            AT_SEA: ["ARRIVED"],
            ARRIVED: ["COMPLETED"],
            COMPLETED: []
        };

        if (!transitions[shipment.status]?.includes(status)) {
            return res.status(400).json({
                success: false,
                message:
                    `Invalid transition from ${shipment.status} to ${status}`
            });
        }

        if (status === "AT_SEA") {
            shipment.departureDate =
                shipment.departureDate || new Date();

            await CargoManifest.updateMany(
                {
                    shipmentId: shipment._id,
                    status: "PACKED"
                },
                {
                    $set: {
                        status: "DISPATCHED"
                    }
                }
            );
        }

        if (status === "ARRIVED") {
            shipment.actualArrival = new Date();
        }

        shipment.status = status;

        await shipment.save();

        return res.status(200).json({
            success: true,
            message: `Shipment status changed to ${status}`,
            shipment
        });
    } catch (error) {
        console.error("Update shipment status error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to update shipment status"
        });
    }
};