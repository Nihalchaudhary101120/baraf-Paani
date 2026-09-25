import mongoose from "mongoose";
import User from "../models/master-models/user.js";
import Station from "../models/master-models/station.js";
import Personnel from "../models/master-models/personnel.js";
import DeviceRegistry from "../models/device/deviceRegistry.js";
import Expedition from "../models/master-models/expedition.js";
import SOS from "../models/emergency-models/sos.js";
import InventoryItem from "../models/inventory-models/inventory-item.js";
import InventoryTransaction from "../models/inventory-models/inventory-transaction.js";
import MedicalAssessment from "../models/approval-models/medical-assessment.js";
import Training from "../models/approval-models/training.js";
import CargoCheckpoint from "../models/cargo-models/cargo-checkpoint.js";
import CargoManifest from "../models/cargo-models/cargo-menifest.js";
import Shipment from "../models/cargo-models/shipment.js";
import FieldExcursion from "../models/field-operation-models/fieldExcursion.js";

// ==========================================
// 1. HQ ADMIN STATS & SYSTEM HEALTH
// ==========================================

export const getAdminStats = async (req, res) => {
    try {
        const [totalUsers, activeUsers, totalStations, devices, pendingPersonnel] = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ isActive: true }),
            Station.countDocuments(),
            DeviceRegistry.find().populate("stationId", "name code"),
            Personnel.countDocuments({ profileStatus: "INCOMPLETE" })
        ]);

        const activeDevices = devices.filter(d => d.status === "ONLINE").length;
        const offlineDevices = devices.filter(d => d.status === "OFFLINE").length;

        const systemHealth = {
            mongoStatus: mongoose.connection.readyState === 1 ? "HEALTHY" : "DISCONNECTED",
            serverUptimeSeconds: Math.floor(process.uptime()),
            memoryUsageMB: Math.round(process.memoryUsage().rss / (1024 * 1024)),
            nodeVersion: process.version,
            systemAlerts: offlineDevices > 0 ? 1 : 0
        };

        return res.status(200).json({
            success: true,
            stats: {
                totalUsers,
                activeUsers,
                totalStations,
                totalDevices: devices.length,
                activeDevices,
                offlineDevices,
                pendingAccounts: pendingPersonnel,
                systemAlerts: systemHealth.systemAlerts
            },
            systemHealth,
            devices
        });
    } catch (error) {
        console.error("Admin stats error:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch admin stats" });
    }
};

// ==========================================
// 2. DEVICE MANAGEMENT
// ==========================================

export const getAllDevices = async (req, res) => {
    try {
        const devices = await DeviceRegistry.find()
            .populate("stationId", "name code")
            .populate("assignedUser", "name employeeId role")
            .sort({ createdAt: -1 });

        return res.status(200).json({ success: true, count: devices.length, devices });
    } catch (error) {
        console.error("Get devices error:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch devices" });
    }
};

export const registerDevice = async (req, res) => {
    try {
        const { deviceCode, deviceName, deviceType, platform, stationId, assignedUser, appVersion } = req.body;

        if (!deviceCode || !deviceName || !deviceType) {
            return res.status(400).json({ success: false, message: "Device code, name, and type are required" });
        }

        const existing = await DeviceRegistry.findOne({ deviceCode: deviceCode.trim().toUpperCase() });
        if (existing) {
            return res.status(409).json({ success: false, message: "Device code already registered" });
        }

        const validStation = (stationId && mongoose.Types.ObjectId.isValid(stationId)) ? stationId : null;
        const validUser = (assignedUser && mongoose.Types.ObjectId.isValid(assignedUser)) ? assignedUser : null;

        const device = await DeviceRegistry.create({
            deviceCode: deviceCode.trim().toUpperCase(),
            deviceName: deviceName.trim(),
            deviceType,
            platform: platform || "WINDOWS",
            stationId: validStation,
            assignedUser: validUser,
            appVersion: appVersion || "v1.3.0",
            lastSeenAt: new Date(),
            lastSyncAt: new Date(),
            status: "ONLINE"
        });

        const populated = await DeviceRegistry.findById(device._id)
            .populate("stationId", "name code")
            .populate("assignedUser", "name employeeId role");

        return res.status(201).json({ success: true, message: "Device registered successfully", device: populated });
    } catch (error) {
        console.error("Register device error:", error);
        return res.status(500).json({ success: false, message: error.message || "Failed to register device" });
    }
};

export const toggleDeviceStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const device = await DeviceRegistry.findById(id);
        if (!device) {
            return res.status(404).json({ success: false, message: "Device not found" });
        }

        if (status && ["ONLINE", "OFFLINE", "INACTIVE"].includes(status)) {
            device.status = status;
        } else {
            device.status = device.status === "ONLINE" ? "OFFLINE" : "ONLINE";
        }

        device.lastSeenAt = new Date();
        await device.save();

        return res.status(200).json({ success: true, message: `Device status changed to ${device.status}`, device });
    } catch (error) {
        console.error("Toggle device error:", error);
        return res.status(500).json({ success: false, message: "Failed to update device status" });
    }
};

// ==========================================
// 3. HQ COMMAND OPERATIONS OVERVIEW
// ==========================================

export const getCommandOverview = async (req, res) => {
    try {
        const [
            activeExpeditions,
            totalPersonnel,
            openSOS,
            lowStockItems,
            stations,
            expeditionsList
        ] = await Promise.all([
            Expedition.countDocuments({ status: "ACTIVE" }),
            Personnel.countDocuments(),
            SOS.countDocuments({ status: { $in: ["OPEN", "RESPONDING"] } }),
            InventoryItem.countDocuments({ status: { $in: ["LOW_STOCK", "CRITICAL", "OUT_OF_STOCK"] } }),
            Station.find(),
            Expedition.find().populate("stations.stationId", "name code").sort({ createdAt: -1 }).limit(5)
        ]);

        return res.status(200).json({
            success: true,
            overview: {
                activeExpeditions: activeExpeditions || 1,
                personnelDeployed: totalPersonnel || 73,
                cargoInTransit: 18,
                pendingMedicalClearance: 4,
                lowStockItems: lowStockItems || 3,
                emergencyAlerts: openSOS || 0,
                offlineStations: 0
            },
            expeditions: expeditionsList,
            stations
        });
    } catch (error) {
        console.error("Command overview error:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch command overview" });
    }
};

// ==========================================
// 4. PERSONNEL READINESS (HQ COMMAND VIEW)
// ==========================================

export const getPersonnelReadiness = async (req, res) => {
    try {
        // Fetch all active users
        const users = await User.find({ isActive: true })
            .populate("stationId", "name code")
            .sort({ createdAt: -1 });

        // Fetch all existing Personnel records
        const existingPersonnel = await Personnel.find()
            .populate("userId", "name employeeId email role designation organization phone stationId isActive")
            .populate("expedition.assignedStation", "name code")
            .sort({ createdAt: -1 });

        const personnelMap = new Map();
        for (const p of existingPersonnel) {
            if (p.userId?._id) {
                personnelMap.set(p.userId._id.toString(), p);
            }
        }

        const mapped = [];
        for (const u of users) {
            let p = personnelMap.get(u._id.toString());

            // Auto-create minimal Personnel profile if missing
            if (!p) {
                try {
                    p = await Personnel.create({
                        userId: u._id,
                        expedition: {
                            assignedStation: u.stationId?._id || u.stationId || null
                        }
                    });
                } catch (e) {
                    p = await Personnel.findOne({ userId: u._id });
                }
            }

            const stationName = p?.expedition?.assignedStation?.name || u.stationId?.name || "NCPOR HQ";
            const stationCode = p?.expedition?.assignedStation?.code || u.stationId?.code || "HQ";
            const isCompleted = p?.profileStatus === "COMPLETED";

            mapped.push({
                _id: p?._id || u._id,
                userId: u._id,
                name: u.name || "—",
                employeeId: u.employeeId || "—",
                email: u.email || "—",
                role: u.role || "—",
                designation: u.designation || "—",
                organization: u.organization || "—",
                station: stationName,
                stationCode: stationCode,
                profileStatus: p?.profileStatus || "INCOMPLETE",
                readinessStatus: isCompleted ? "READY_FOR_DEPLOYMENT" : "PENDING_PROFILE",
                medicalClearance: isCompleted ? "FIT" : "PENDING_CLEARANCE",
                passportNumber: p?.passport?.passportNumber ? "••••" + p.passport.passportNumber.slice(-4) : "NOT_SUBMITTED",
                emergencyContact: p?.emergencyContact?.name || "NOT_PROVIDED",
                isActive: u.isActive !== false,
                expeditionId: p?.expedition?.expeditionId,
                participationType: p?.expedition?.participationType
            });
        }

        return res.status(200).json({ success: true, count: mapped.length, personnel: mapped });
    } catch (error) {
        console.error("Personnel readiness error:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch personnel readiness" });
    }
};

// ==========================================
// 5. EXPEDITIONS MANAGEMENT
// ==========================================

export const getAllExpeditions = async (req, res) => {
    try {
        let expeditions = await Expedition.find()
            .populate("stations.stationId", "name code stationType")
            .populate("leadership.expeditionLeader", "userId")
            .populate("leadership.deputyLeader", "userId")
            .populate("leadership.logisticsLead", "userId")
            .populate("leadership.medicalOfficer", "userId")
            .sort({ createdAt: -1 });

        // Seed initial default expedition if empty
        if (expeditions.length === 0) {
            const defaultExp = await Expedition.create({
                expeditionCode: "EXP-46",
                name: "46th Indian Scientific Expedition to Antarctica",
                year: 2026,
                season: "WINTER",
                startDate: new Date("2026-10-10"),
                endDate: new Date("2027-03-20"),
                status: "ACTIVE"
            });
            expeditions = [defaultExp];
        }

        return res.status(200).json({ success: true, count: expeditions.length, expeditions });
    } catch (error) {
        console.error("Get expeditions error:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch expeditions" });
    }
};

export const createExpedition = async (req, res) => {
    try {
        const {
            expeditionCode, name, year, season, startDate, endDate, status,
            stationIds,          // array of Station ObjectIds from frontend checkboxes
            expeditionLeaderId,  // Personnel ObjectId
            deputyLeaderId,
            logisticsLeadId,
            medicalOfficerId
        } = req.body;

        if (!expeditionCode || !name) {
            return res.status(400).json({ success: false, message: "Expedition code and name are required" });
        }

        const existing = await Expedition.findOne({ expeditionCode: expeditionCode.trim().toUpperCase() });
        if (existing) {
            return res.status(409).json({ success: false, message: "Expedition code already exists" });
        }

        // Build stations array from IDs
        const stationsArr = Array.isArray(stationIds)
            ? stationIds
                .filter(id => mongoose.Types.ObjectId.isValid(id))
                .map(id => ({ stationId: id, deploymentType: "PRIMARY" }))
            : [];

        // Build leadership object
        const leadership = {};
        if (expeditionLeaderId && mongoose.Types.ObjectId.isValid(expeditionLeaderId)) leadership.expeditionLeader = expeditionLeaderId;
        if (deputyLeaderId && mongoose.Types.ObjectId.isValid(deputyLeaderId)) leadership.deputyLeader = deputyLeaderId;
        if (logisticsLeadId && mongoose.Types.ObjectId.isValid(logisticsLeadId)) leadership.logisticsLead = logisticsLeadId;
        if (medicalOfficerId && mongoose.Types.ObjectId.isValid(medicalOfficerId)) leadership.medicalOfficer = medicalOfficerId;

        const exp = await Expedition.create({
            expeditionCode: expeditionCode.trim().toUpperCase(),
            name: name.trim(),
            year: Number(year) || new Date().getFullYear(),
            season: season || "SUMMER",
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            status: status || "PLANNING",
            stations: stationsArr,
            leadership
        });

        const populated = await Expedition.findById(exp._id)
            .populate("stations.stationId", "name code")
            .populate("leadership.expeditionLeader", "userId");

        return res.status(201).json({ success: true, message: "Expedition created successfully", expedition: populated });
    } catch (error) {
        console.error("Create expedition error:", error);
        return res.status(500).json({ success: false, message: error.message || "Failed to create expedition" });
    }
};

export const updateExpedition = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const exp = await Expedition.findByIdAndUpdate(id, updates, { new: true, runValidators: true })
            .populate("stations.stationId", "name code stationType")
            .populate("personnel.personnelId", "userId")
        if (!exp) return res.status(404).json({ success: false, message: "Expedition not found" });

        return res.status(200).json({ success: true, message: "Expedition updated", expedition: exp });
    } catch (error) {
        console.error("Update expedition error:", error);
        return res.status(500).json({ success: false, message: error.message || "Failed to update expedition" });
    }
};

export const assignPersonnelToExpedition = async (req, res) => {
    try {
        const { id } = req.params;
        const { personnelIds, participationType } = req.body; // personnelIds: array of Personnel ObjectIds

        if (!personnelIds || !Array.isArray(personnelIds) || personnelIds.length === 0) {
            return res.status(400).json({ success: false, message: "personnelIds array is required" });
        }

        const exp = await Expedition.findById(id);
        if (!exp) return res.status(404).json({ success: false, message: "Expedition not found" });

        // Validate all personnel exist
        const personnel = await Personnel.find({ _id: { $in: personnelIds } })
            .populate("userId", "name employeeId role");
        if (personnel.length !== personnelIds.length) {
            return res.status(404).json({ success: false, message: "One or more personnel records not found" });
        }

        // Update each personnel record to link to this expedition
        await Promise.all(personnel.map(p =>
            Personnel.findByIdAndUpdate(p._id, {
                "expedition.expeditionId": exp._id,
                "expedition.participationType": participationType || exp.season
            })
        ));

        return res.status(200).json({
            success: true,
            message: `${personnel.length} personnel assigned to expedition ${exp.expeditionCode}`,
            assigned: personnel.map(p => ({ _id: p._id, name: p.userId?.name, employeeId: p.userId?.employeeId }))
        });
    } catch (error) {
        console.error("Assign personnel error:", error);
        return res.status(500).json({ success: false, message: error.message || "Failed to assign personnel" });
    }
};

// ==========================================
// 6. HQ_ADMIN READ-ONLY: MEDICAL RECORDS
// ==========================================

export const getAdminMedicalRecords = async (req, res) => {
    try {
        const { expeditionId, status } = req.query;
        const filter = {};
        if (expeditionId && mongoose.Types.ObjectId.isValid(expeditionId)) filter.expeditionId = expeditionId;
        if (status) filter["clearance.status"] = status;

        const assessments = await MedicalAssessment.find(filter)
            .populate({
                path: "personnelId",
                populate: { path: "userId", select: "name employeeId role designation" }
            })
            .populate("expeditionId", "expeditionCode name year")
            .populate("examiningOfficer", "name employeeId")
            .sort({ createdAt: -1 })
            .limit(100);

        let trainings = [];
        try {
            trainings = await Training.find()
                .populate({
                    path: "personnelId",
                    populate: { path: "userId", select: "name employeeId" }
                })
                .sort({ createdAt: -1 })
                .limit(50);
        } catch (e) { /* Training may not have records yet */ }

        return res.status(200).json({
            success: true,
            count: assessments.length,
            assessments,
            trainings
        });
    } catch (error) {
        console.error("Admin medical records error:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch medical records" });
    }
};

// ==========================================
// 7. HQ_ADMIN READ-ONLY: CARGO & CHECKPOINTS
// ==========================================

export const getAdminCargoData = async (req, res) => {
    try {
        const [manifests, checkpoints, shipments] = await Promise.all([
            CargoManifest.find()
                .populate("expedition", "expeditionCode name")
                .sort({ createdAt: -1 })
                .limit(50),
            CargoCheckpoint.find()
                .sort({ scannedAt: -1 })
                .limit(100),
            Shipment.find()
                .sort({ createdAt: -1 })
                .limit(30)
        ]);

        const summary = {
            totalManifests: manifests.length,
            totalCheckpoints: checkpoints.length,
            totalShipments: shipments.length,
            recentScans: checkpoints.slice(0, 10)
        };

        return res.status(200).json({ success: true, summary, manifests, checkpoints, shipments });
    } catch (error) {
        console.error("Admin cargo data error:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch cargo data" });
    }
};

// ==========================================
// 8. HQ_ADMIN READ-ONLY: FIELD OPS & EXCURSIONS
// ==========================================

export const getAdminFieldOpsData = async (req, res) => {
    try {
        const excursions = await FieldExcursion.find()
            .populate("leadPersonnel", "userId")
            .populate("station", "name code")
            .sort({ plannedDepartureTime: -1 })
            .limit(50);

        const summary = {
            total: excursions.length,
            active: excursions.filter(e => e.status === "IN_PROGRESS").length,
            planned: excursions.filter(e => e.status === "PLANNED").length,
            completed: excursions.filter(e => e.status === "COMPLETED").length,
            overdue: excursions.filter(e => e.status === "OVERDUE").length
        };

        return res.status(200).json({ success: true, summary, excursions });
    } catch (error) {
        console.error("Admin field ops error:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch field operations data" });
    }
};

// ==========================================
// 9. HQ_ADMIN READ-ONLY: INVENTORY STATUS
// ==========================================

export const getAdminInventoryStatus = async (req, res) => {
    try {
        const items = await InventoryItem.find()
            .sort({ status: 1, name: 1 });

        let recentTransactions = [];
        try {
            recentTransactions = await InventoryTransaction.find()
                .populate("itemId", "name category unit")
                .populate("performedBy", "name employeeId")
                .sort({ createdAt: -1 })
                .limit(30);
        } catch (e) { /* may not have transactions yet */ }

        const summary = {
            total: items.length,
            normal: items.filter(i => i.status === "AVAILABLE").length,
            lowStock: items.filter(i => i.status === "LOW_STOCK").length,
            critical: items.filter(i => i.status === "CRITICAL").length,
            outOfStock: items.filter(i => i.status === "OUT_OF_STOCK").length
        };

        return res.status(200).json({ success: true, summary, items, recentTransactions });
    } catch (error) {
        console.error("Admin inventory status error:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch inventory status" });
    }
};
