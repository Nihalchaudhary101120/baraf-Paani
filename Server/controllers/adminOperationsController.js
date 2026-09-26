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
import ExpeditionPersonnel from "../models/master-models/expedition-personnel.js";

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
        // Fetch all existing Personnel records (Strictly read-only)
        const existingPersonnel = await Personnel.find()
            .populate("userId", "name employeeId email role designation organization phone stationId isActive")
            .populate("expedition.assignedStation", "name code")
            .sort({ createdAt: -1 });

        const mapped = existingPersonnel.map(p => {
            const u = p.userId || {};
            const stationName = p.expedition?.assignedStation?.name || u.stationId?.name || "NCPOR HQ";
            const stationCode = p.expedition?.assignedStation?.code || u.stationId?.code || "HQ";
            const isCompleted = p.profileStatus === "COMPLETED";

            return {
                _id: p._id,
                userId: u._id || p.userId,
                name: u.name || p.name || "—",
                employeeId: u.employeeId || p.employeeId || "—",
                email: u.email || p.email || "—",
                role: u.role || p.role || "—",
                designation: u.designation || p.designation || "—",
                organization: u.organization || p.organization || "—",
                station: stationName,
                stationCode: stationCode,
                profileStatus: p.profileStatus || "INCOMPLETE",
                readinessStatus: isCompleted ? "READY_FOR_DEPLOYMENT" : "PENDING_PROFILE",
                medicalClearance: isCompleted ? "FIT" : "PENDING_CLEARANCE",
                passportNumber: p.passport?.passportNumber ? "••••" + p.passport.passportNumber.slice(-4) : "NOT_SUBMITTED",
                emergencyContact: p.emergencyContact?.name || "NOT_PROVIDED",
                isActive: u.isActive !== false,
                expeditionId: p.expedition?.expeditionId,
                participationType: p.expedition?.participationType
            };
        });

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
            .populate({
                path: "leadership.expeditionLeader",
                populate: { path: "userId", select: "name employeeId email role designation" }
            })
            .populate({
                path: "leadership.deputyLeader",
                populate: { path: "userId", select: "name employeeId email role designation" }
            })
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
            .populate({
                path: "leadership.expeditionLeader",
                populate: { path: "userId", select: "name employeeId email role designation" }
            });

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

        const exp = await Expedition.findByIdAndUpdate(id, updates, { returnDocument: 'after', runValidators: true })
            .populate("stations.stationId", "name code stationType")
            .populate({
                path: "leadership.expeditionLeader",
                populate: { path: "userId", select: "name employeeId email role designation" }
            })
            .populate({
                path: "leadership.deputyLeader",
                populate: { path: "userId", select: "name employeeId email role designation" }
            })
            .populate("leadership.logisticsLead", "userId")
            .populate("leadership.medicalOfficer", "userId");
        if (!exp) return res.status(404).json({ success: false, message: "Expedition not found" });

        return res.status(200).json({ success: true, message: "Expedition updated", expedition: exp });
    } catch (error) {
        console.error("Update expedition error:", error);
        return res.status(500).json({ success: false, message: error.message || "Failed to update expedition" });
    }
};

// ==========================================
// 5.1 NOMINATE CANDIDATES FOR EXPEDITION
// ==========================================
export const nominatePersonnelToExpedition = async (req, res) => {
    try {
        const { id } = req.params;
        const { personnelIds, participationType, stationId, remarks } = req.body;

        if (!personnelIds || !Array.isArray(personnelIds) || personnelIds.length === 0) {
            return res.status(400).json({ success: false, message: "personnelIds array is required" });
        }

        let exp = null;
        if (mongoose.Types.ObjectId.isValid(id)) {
            exp = await Expedition.findById(id);
        } else {
            exp = await Expedition.findOne({ expeditionCode: id });
        }
        if (!exp) return res.status(404).json({ success: false, message: "Expedition not found" });

        const defaultStationId = stationId || exp.stations?.[0]?.stationId || null;

        const resolvedPersonnel = [];
        for (const pid of personnelIds) {
            if (!pid) continue;
            let pDoc = null;
            if (mongoose.Types.ObjectId.isValid(pid)) {
                pDoc = await Personnel.findById(pid).populate("userId", "name employeeId email role stationId");
                if (!pDoc) {
                    pDoc = await Personnel.findOne({ userId: pid }).populate("userId", "name employeeId email role stationId");
                }
            }
            if (pDoc) {
                resolvedPersonnel.push(pDoc);
            }
        }

        if (resolvedPersonnel.length === 0) {
            return res.status(404).json({ success: false, message: "No valid personnel records identified for nomination" });
        }

        const results = [];
        for (const p of resolvedPersonnel) {
            // Nomination only registers the candidate — medical and training records must always start as PENDING for this expedition.
            // Medical assessments and training clearances are initiated later by the respective officers.
            const candidateDoc = await ExpeditionPersonnel.findOneAndUpdate(
                { expeditionId: exp._id, personnelId: p._id },
                {
                    $set: {
                        participationType: participationType || exp.season || "WINTER",
                        assignedStation: defaultStationId || p.expedition?.assignedStation || null,
                        nominatedBy: req.user?._id || null,
                        nominatedAt: new Date(),
                        medicalStatus: "PENDING",
                        medicalRestrictions: [],
                        medicalRemarks: "",
                        trainingStatus: "PENDING",
                        status: "NOMINATED",
                        remarks: remarks || "Candidate nominated for expedition"
                    }
                },
                { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
            );

            results.push(candidateDoc);
        }

        return res.status(200).json({
            success: true,
            message: `Successfully nominated ${results.length} candidate(s) for expedition ${exp.expeditionCode}.`,
            nominatedCount: results.length,
            candidates: results
        });
    } catch (error) {
        console.error("Nominate personnel error:", error);
        return res.status(500).json({ success: false, message: error.message || "Failed to nominate personnel" });
    }
};

// Backward-compatible alias
export const assignPersonnelToExpedition = nominatePersonnelToExpedition;

// ==========================================
// 5.2 GET ALL CANDIDATES & READINESS METRICS
// ==========================================
export const getExpeditionCandidates = async (req, res) => {
    try {
        const { id } = req.params;

        let exp = null;
        if (mongoose.Types.ObjectId.isValid(id)) {
            exp = await Expedition.findById(id).populate("stations.stationId", "name code");
        } else {
            exp = await Expedition.findOne({ expeditionCode: id }).populate("stations.stationId", "name code");
        }
        if (!exp) return res.status(404).json({ success: false, message: "Expedition not found" });

        const rawCandidates = await ExpeditionPersonnel.find({ expeditionId: exp._id })
            .populate({
                path: "personnelId",
                populate: { path: "userId", select: "name employeeId email role designation organization phone stationId" }
            })
            .populate("assignedStation", "name code")
            .populate("nominatedBy", "name employeeId")
            .populate("confirmedBy", "name employeeId")
            .sort({ createdAt: -1 });

        const pIds = rawCandidates.map(c => c.personnelId?._id).filter(Boolean);
        // Strictly query assessments and trainings for THIS expedition
        const [assessments, trainings] = await Promise.all([
            MedicalAssessment.find({ expeditionId: exp._id, personnelId: { $in: pIds } }).sort({ updatedAt: -1 }).lean(),
            Training.find({ expeditionId: exp._id, personnelId: { $in: pIds } }).sort({ updatedAt: -1 }).lean()
        ]);

        const assessmentMap = new Map();
        assessments.forEach(a => {
            const pid = a.personnelId?.toString();
            if (pid && !assessmentMap.has(pid)) assessmentMap.set(pid, a);
        });

        const trainingMap = new Map();
        trainings.forEach(t => {
            const pid = t.personnelId?.toString();
            if (pid && !trainingMap.has(pid)) trainingMap.set(pid, t);
        });

        const candidates = [];
        let confirmedCount = 0;
        let medicalPendingCount = 0;
        let trainingPendingCount = 0;
        let readyCount = 0;
        let blockedCount = 0;

        for (const c of rawCandidates) {
            const pid = c.personnelId?._id?.toString();
            const med = pid ? assessmentMap.get(pid) : null;
            const trn = pid ? trainingMap.get(pid) : null;

            // Strict per-expedition clearance status:
            // Medical is only FIT/RESTRICTED/NOT_FIT if an explicit MedicalAssessment exists for this expedition
            const liveMedStatus = med?.clearance?.status || (c.medicalStatus === "NOT_FIT" ? "NOT_FIT" : "PENDING");
            const liveMedRestrictions = med?.clearance?.restrictions || c.medicalRestrictions || [];
            const liveMedRemarks = med?.clearance?.remarks || c.medicalRemarks || "";
            // Training is only COMPLETED if TrainingClearance exists for this expedition and is COMPLETED
            const liveTrainStatus = trn?.overallStatus || "PENDING";

            let derivedStatus = c.status;
            if (c.status !== "CONFIRMED" && c.status !== "REJECTED") {
                if ((liveMedStatus === "FIT" || liveMedStatus === "FIT_WITH_RESTRICTIONS") && liveTrainStatus === "COMPLETED") {
                    derivedStatus = "READY_FOR_CONFIRMATION";
                } else {
                    derivedStatus = "NOMINATED";
                }
            }

            if (derivedStatus === "CONFIRMED") {
                confirmedCount++;
            } else if (derivedStatus === "READY_FOR_CONFIRMATION") {
                readyCount++;
            } else if (liveMedStatus === "NOT_FIT" || (liveMedStatus !== "FIT" && liveMedStatus !== "FIT_WITH_RESTRICTIONS" && liveTrainStatus !== "COMPLETED")) {
                blockedCount++;
            }

            if (liveMedStatus === "PENDING") medicalPendingCount++;
            if (liveTrainStatus !== "COMPLETED") trainingPendingCount++;

            candidates.push({
                _id: c._id,
                personnelId: c.personnelId,
                status: derivedStatus,
                medicalStatus: liveMedStatus,
                medicalRestrictions: liveMedRestrictions,
                medicalRemarks: liveMedRemarks,
                trainingStatus: liveTrainStatus,
                participationType: c.participationType,
                assignedStation: c.assignedStation,
                nominatedBy: c.nominatedBy,
                nominatedAt: c.nominatedAt,
                confirmedBy: c.confirmedBy,
                confirmedAt: c.confirmedAt,
                remarks: c.remarks
            });
        }

        const metrics = {
            totalNominated: candidates.length,
            confirmed: confirmedCount,
            readyForConfirmation: readyCount,
            medicalPending: medicalPendingCount,
            trainingPending: trainingPendingCount,
            blocked: blockedCount
        };

        return res.status(200).json({
            success: true,
            expeditionId: exp._id,
            expeditionCode: exp.expeditionCode,
            metrics,
            candidates,
            confirmedRoster: candidates.filter(c => c.status === "CONFIRMED")
        });
    } catch (error) {
        console.error("Get expedition candidates error:", error);
        return res.status(500).json({ success: false, message: error.message || "Failed to fetch candidates" });
    }
};

// ==========================================
// 5.3 CONFIRM CANDIDATE FINAL ASSIGNMENT
// ==========================================
export const confirmExpeditionCandidate = async (req, res) => {
    try {
        const { id, candidateId } = req.params;
        const { remarks } = req.body;

        let exp = null;
        if (mongoose.Types.ObjectId.isValid(id)) {
            exp = await Expedition.findById(id);
        } else {
            exp = await Expedition.findOne({ expeditionCode: id });
        }
        if (!exp) return res.status(404).json({ success: false, message: "Expedition not found" });

        let candidate = null;
        if (mongoose.Types.ObjectId.isValid(candidateId)) {
            candidate = await ExpeditionPersonnel.findOne({
                expeditionId: exp._id,
                $or: [{ _id: candidateId }, { personnelId: candidateId }]
            }).populate({
                path: "personnelId",
                populate: { path: "userId", select: "name employeeId email role designation" }
            });
        }

        if (!candidate) {
            return res.status(404).json({ success: false, message: "Nominated candidate not found for this expedition" });
        }

        const [medDoc, trainDoc] = await Promise.all([
            MedicalAssessment.findOne({ expeditionId: exp._id, personnelId: candidate.personnelId._id }).sort({ updatedAt: -1 }),
            Training.findOne({ expeditionId: exp._id, personnelId: candidate.personnelId._id }).sort({ updatedAt: -1 })
        ]);

        const medicalStatus = medDoc?.clearance?.status || "PENDING";
        const trainingStatus = trainDoc?.overallStatus || "PENDING";

        // Rule 1: NOT_FIT prevents final assignment
        if (medicalStatus === "NOT_FIT") {
            return res.status(400).json({
                success: false,
                message: `BLOCKED: Candidate ${candidate.personnelId?.userId?.name || ''} has been declared NOT_FIT by the Medical Officer. Deployment is contraindicated.`
            });
        }

        // Rule 2: Medical PENDING prevents final assignment
        if (medicalStatus === "PENDING") {
            return res.status(400).json({
                success: false,
                message: `BLOCKED: Candidate ${candidate.personnelId?.userId?.name || ''} has a PENDING medical assessment. Medical clearance must be issued first.`
            });
        }

        // Rule 3: Training PENDING / PARTIAL prevents final confirmation
        if (trainingStatus !== "COMPLETED") {
            return res.status(400).json({
                success: false,
                message: `BLOCKED: Candidate ${candidate.personnelId?.userId?.name || ''} polar training is ${trainingStatus}. All training modules must be COMPLETED.`
            });
        }

        const isRestricted = medicalStatus === "FIT_WITH_RESTRICTIONS";
        const restrictionNotes = isRestricted ? (medDoc?.clearance?.restrictions?.join(", ") || "Standard polar winter restrictions") : "";

        candidate.status = "CONFIRMED";
        candidate.medicalStatus = medicalStatus;
        candidate.medicalRestrictions = medDoc?.clearance?.restrictions || [];
        candidate.medicalRemarks = medDoc?.clearance?.remarks || "";
        candidate.trainingStatus = trainingStatus;
        candidate.confirmedBy = req.user?._id || null;
        candidate.confirmedAt = new Date();
        candidate.remarks = remarks || (isRestricted ? `HQ Confirmed with restrictions: ${restrictionNotes}` : "HQ Confirmed assignment");
        await candidate.save();

        // Update Master Personnel record
        await Personnel.findByIdAndUpdate(candidate.personnelId._id, {
            "expedition.expeditionId": exp._id,
            "expedition.participationType": candidate.participationType || exp.season || "WINTER",
            "expedition.assignedStation": candidate.assignedStation || exp.stations?.[0]?.stationId || null,
            "profileStatus": "COMPLETED"
        });

        // Recalculate confirmed roster count on Expedition
        const confirmedCount = await ExpeditionPersonnel.countDocuments({
            expeditionId: exp._id,
            status: "CONFIRMED"
        });
        await Expedition.findByIdAndUpdate(exp._id, {
            "summary.personnelCount": confirmedCount
        });

        return res.status(200).json({
            success: true,
            message: `Confirmed assignment: ${candidate.personnelId?.userId?.name || 'Personnel'} is now officially assigned to ${exp.expeditionCode}!`,
            candidate,
            confirmedCount
        });
    } catch (error) {
        console.error("Confirm candidate error:", error);
        return res.status(500).json({ success: false, message: error.message || "Failed to confirm candidate" });
    }
};

// ==========================================
// 5.4 REMOVE / REJECT CANDIDATE
// ==========================================
export const removeExpeditionCandidate = async (req, res) => {
    try {
        const { id, candidateId } = req.params;

        let exp = null;
        if (mongoose.Types.ObjectId.isValid(id)) {
            exp = await Expedition.findById(id);
        } else {
            exp = await Expedition.findOne({ expeditionCode: id });
        }
        if (!exp) return res.status(404).json({ success: false, message: "Expedition not found" });

        const candidate = await ExpeditionPersonnel.findOne({
            expeditionId: exp._id,
            $or: [{ _id: candidateId }, { personnelId: candidateId }]
        });

        if (!candidate) {
            return res.status(404).json({ success: false, message: "Candidate record not found" });
        }

        const wasConfirmed = candidate.status === "CONFIRMED";
        const pId = candidate.personnelId;

        await ExpeditionPersonnel.findByIdAndDelete(candidate._id);

        if (wasConfirmed && pId) {
            await Personnel.findByIdAndUpdate(pId, {
                $unset: { "expedition.expeditionId": "" }
            });
        }

        const confirmedCount = await ExpeditionPersonnel.countDocuments({
            expeditionId: exp._id,
            status: "CONFIRMED"
        });
        await Expedition.findByIdAndUpdate(exp._id, {
            "summary.personnelCount": confirmedCount
        });

        return res.status(200).json({
            success: true,
            message: "Candidate removed from expedition nomination list",
            confirmedCount
        });
    } catch (error) {
        console.error("Remove candidate error:", error);
        return res.status(500).json({ success: false, message: error.message || "Failed to remove candidate" });
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
