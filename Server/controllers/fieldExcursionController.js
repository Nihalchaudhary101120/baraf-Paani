import mongoose from "mongoose";
import FieldExcursion from "../models/field-operation-models/fieldExcursion.js";
import FieldCheckIn from "../models/field-operation-models/fieldCheckIns.js";
import Personnel from "../models/master-models/personnel.js";
import Station from "../models/master-models/station.js";
import User from "../models/master-models/user.js";

/**
 * Generate unique excursion number: EXC-YYYY-001
 */
const generateExcursionNumber = async () => {
    const year = new Date().getFullYear();
    const prefix = `EXC-${year}-`;
    const last = await FieldExcursion.findOne({
        excursionNumber: new RegExp(`^${prefix}`)
    }).sort({ excursionNumber: -1 });

    let seq = 1;
    if (last && last.excursionNumber) {
        const parts = last.excursionNumber.split("-");
        const lastNum = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastNum)) seq = lastNum + 1;
    }
    return `${prefix}${String(seq).padStart(3, "0")}`;
};

/**
 * Auto-detect and transition ACTIVE excursions past expectedReturnTime to OVERDUE in MongoDB
 */
const autoUpdateOverdueExcursions = async (filter = {}) => {
    try {
        const now = new Date();
        await FieldExcursion.updateMany(
            {
                ...filter,
                status: "ACTIVE",
                expectedReturnTime: { $lt: now }
            },
            {
                $set: { status: "OVERDUE" }
            }
        );
    } catch (err) {
        console.error("Error auto-updating overdue excursions:", err);
    }
};

/**
 * 1. CREATE FIELD EXCURSION (Station Operator)
 * Initial status: PLANNED
 */
export const createFieldExcursion = async (req, res) => {
    try {
        const {
            stationId,
            leaderId,
            members = [],
            purpose,
            destination,
            transportMode,
            departureTime,
            expectedReturnTime,
            checkInIntervalMinutes = 60,
            weatherRisk = "LOW",
            eventId
        } = req.body;

        // 1. Resolve & Validate Station
        let targetStationId = stationId || req.user.stationId;
        if (!targetStationId) {
            // Fallback to Bharati or first active station
            const defaultStation = await Station.findOne({ code: "BHARATI" }) || await Station.findOne();
            if (defaultStation) targetStationId = defaultStation._id;
        }

        if (!targetStationId || !mongoose.Types.ObjectId.isValid(targetStationId)) {
            return res.status(400).json({
                success: false,
                message: "Valid Station is required to create a field excursion"
            });
        }

        const station = await Station.findById(targetStationId);
        if (!station) {
            return res.status(404).json({
                success: false,
                message: "Station not found"
            });
        }

        // 2. Validate Team Leader
        if (!leaderId || !mongoose.Types.ObjectId.isValid(leaderId)) {
            return res.status(400).json({
                success: false,
                message: "Valid Team Leader (Personnel) is required"
            });
        }

        const leader = await Personnel.findById(leaderId).populate("userId", "name employeeId email stationId");
        if (!leader) {
            return res.status(404).json({
                success: false,
                message: "Team Leader personnel record not found"
            });
        }

        // 3. Validate Team Members
        const validMembers = [];
        if (Array.isArray(members) && members.length > 0) {
            for (const mId of members) {
                if (!mongoose.Types.ObjectId.isValid(mId)) {
                    return res.status(400).json({
                        success: false,
                        message: `Invalid Personnel ID in members list: ${mId}`
                    });
                }
                if (mId.toString() === leaderId.toString()) {
                    return res.status(400).json({
                        success: false,
                        message: "Team Leader cannot be duplicated inside team members"
                    });
                }
                const memberDoc = await Personnel.findById(mId);
                if (!memberDoc) {
                    return res.status(404).json({
                        success: false,
                        message: `Personnel member record not found for ID: ${mId}`
                    });
                }
                if (!validMembers.includes(mId.toString())) {
                    validMembers.push(mId.toString());
                }
            }
        }

        // 4. Validate Purpose & Destination
        if (!purpose || typeof purpose !== "string" || !purpose.trim()) {
            return res.status(400).json({
                success: false,
                message: "Purpose is required for the field excursion"
            });
        }

        const destName = destination?.name || (typeof destination === "string" ? destination : "");
        if (!destName || !destName.trim()) {
            return res.status(400).json({
                success: false,
                message: "Destination name is required"
            });
        }

        const destinationObj = {
            name: destName.trim(),
            coordinates: {
                latitude: Number(destination?.coordinates?.latitude ?? destination?.latitude ?? 0),
                longitude: Number(destination?.coordinates?.longitude ?? destination?.longitude ?? 0)
            }
        };

        // 5. Validate Transport Mode
        const allowedTransport = ["SNOWMOBILE", "TRACK_VEHICLE", "HELICOPTER", "FOOT"];
        const normalizedTransport = transportMode?.toUpperCase()?.replace(" ", "_");
        const finalTransport = allowedTransport.includes(normalizedTransport) ? normalizedTransport : "TRACK_VEHICLE";

        // 6. Validate Departure & Expected Return Times
        const depTime = departureTime ? new Date(departureTime) : new Date();
        if (isNaN(depTime.getTime())) {
            return res.status(400).json({
                success: false,
                message: "Valid departure time is required"
            });
        }

        const expReturn = expectedReturnTime ? new Date(expectedReturnTime) : new Date(depTime.getTime() + 8 * 3600 * 1000);
        if (isNaN(expReturn.getTime())) {
            return res.status(400).json({
                success: false,
                message: "Valid expected return time is required"
            });
        }

        if (expReturn.getTime() <= depTime.getTime()) {
            return res.status(400).json({
                success: false,
                message: "Expected return time must be strictly after departure time"
            });
        }

        // 7. Validate Check-in Interval & Weather Risk
        const interval = parseInt(checkInIntervalMinutes, 10);
        if (isNaN(interval) || interval <= 0) {
            return res.status(400).json({
                success: false,
                message: "Check-in interval must be a positive number of minutes"
            });
        }

        const allowedRisk = ["LOW", "MEDIUM", "HIGH"];
        const finalRisk = allowedRisk.includes(weatherRisk?.toUpperCase()) ? weatherRisk.toUpperCase() : "LOW";

        // 8. Prevent duplicate eventId if offline synced
        if (eventId) {
            const existing = await FieldExcursion.findOne({ eventId });
            if (existing) {
                return res.status(200).json({
                    success: true,
                    message: "Excursion already created (idempotent)",
                    excursion: existing
                });
            }
        }

        // 9. Generate Excursion Number
        const excursionNumber = await generateExcursionNumber();

        // 10. Create Document
        const excursion = await FieldExcursion.create({
            excursionNumber,
            stationId: targetStationId,
            leaderId,
            members: validMembers,
            purpose: purpose.trim(),
            destination: destinationObj,
            transportMode: finalTransport,
            departureTime: depTime,
            expectedReturnTime: expReturn,
            checkInIntervalMinutes: interval,
            weatherRisk: finalRisk,
            status: "PLANNED",
            eventId: eventId || undefined
        });

        const populated = await FieldExcursion.findById(excursion._id)
            .populate("stationId", "name code stationType")
            .populate({
                path: "leaderId",
                populate: { path: "userId", select: "name employeeId email role designation" }
            })
            .populate({
                path: "members",
                populate: { path: "userId", select: "name employeeId email role designation" }
            });

        return res.status(201).json({
            success: true,
            message: "Field excursion created successfully.",
            excursion: populated
        });
    } catch (error) {
        console.error("Create field excursion error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to create field excursion"
        });
    }
};

/**
 * 2. GET ACTIVE EXCURSIONS (Active, Overdue, Planned)
 */
export const getActiveExcursions = async (req, res) => {
    try {
        await autoUpdateOverdueExcursions();

        const { stationId } = req.query;
        const filter = {
            status: { $in: ["PLANNED", "ACTIVE", "OVERDUE"] }
        };

        if (stationId) {
            filter.stationId = stationId;
        } else if (req.user?.stationId && !["HQ_ADMIN", "HQ_COMMAND"].includes(req.user?.role)) {
            filter.stationId = req.user.stationId;
        }

        const excursions = await FieldExcursion.find(filter)
            .populate("stationId", "name code stationType")
            .populate({
                path: "leaderId",
                populate: { path: "userId", select: "name employeeId email role designation" }
            })
            .populate({
                path: "members",
                populate: { path: "userId", select: "name employeeId email role designation" }
            })
            .sort({ status: 1, departureTime: -1 });

        // Calculate summary counters
        const summary = {
            active: excursions.filter(e => e.status === "ACTIVE").length,
            overdue: excursions.filter(e => e.status === "OVERDUE").length,
            planned: excursions.filter(e => e.status === "PLANNED").length,
            total: excursions.length
        };

        // Also fetch completed count for the station
        const completedCount = await FieldExcursion.countDocuments({
            ...(filter.stationId ? { stationId: filter.stationId } : {}),
            status: "COMPLETED"
        });
        summary.completed = completedCount;

        return res.status(200).json({
            success: true,
            summary,
            count: excursions.length,
            excursions
        });
    } catch (error) {
        console.error("Get active excursions error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch active excursions"
        });
    }
};

/**
 * 3. GET EXCURSION HISTORY (Completed, Cancelled)
 */
export const getExcursionHistory = async (req, res) => {
    try {
        const { stationId } = req.query;
        const filter = {
            status: { $in: ["COMPLETED", "CANCELLED"] }
        };

        if (stationId) {
            filter.stationId = stationId;
        } else if (req.user?.stationId && !["HQ_ADMIN", "HQ_COMMAND"].includes(req.user?.role)) {
            filter.stationId = req.user.stationId;
        }

        const excursions = await FieldExcursion.find(filter)
            .populate("stationId", "name code stationType")
            .populate({
                path: "leaderId",
                populate: { path: "userId", select: "name employeeId email role designation" }
            })
            .populate({
                path: "members",
                populate: { path: "userId", select: "name employeeId email role designation" }
            })
            .sort({ actualReturnTime: -1, updatedAt: -1 });

        return res.status(200).json({
            success: true,
            count: excursions.length,
            excursions
        });
    } catch (error) {
        console.error("Get excursion history error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch excursion history"
        });
    }
};

/**
 * 4. GET MY ACTIVE EXCURSIONS (For assigned personnel)
 */
export const getMyActiveExcursions = async (req, res) => {
    try {
        await autoUpdateOverdueExcursions();

        const personnel = await Personnel.findOne({ userId: req.user.userId });
        if (!personnel) {
            return res.status(200).json({
                success: true,
                count: 0,
                excursions: []
            });
        }

        const excursions = await FieldExcursion.find({
            status: { $in: ["ACTIVE", "OVERDUE"] },
            $or: [
                { leaderId: personnel._id },
                { members: personnel._id }
            ]
        })
            .populate("stationId", "name code")
            .populate({
                path: "leaderId",
                populate: { path: "userId", select: "name employeeId email role designation" }
            })
            .populate({
                path: "members",
                populate: { path: "userId", select: "name employeeId email role designation" }
            })
            .sort({ departureTime: -1 });

        return res.status(200).json({
            success: true,
            count: excursions.length,
            excursions
        });
    } catch (error) {
        console.error("Get my active excursions error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch your assigned excursions"
        });
    }
};

/**
 * 5. GET EXCURSION BY ID
 */
export const getExcursionById = async (req, res) => {
    try {
        await autoUpdateOverdueExcursions();

        const excursion = await FieldExcursion.findById(req.params.id)
            .populate("stationId", "name code stationType")
            .populate({
                path: "leaderId",
                populate: { path: "userId", select: "name employeeId email role designation" }
            })
            .populate({
                path: "members",
                populate: { path: "userId", select: "name employeeId email role designation" }
            });

        if (!excursion) {
            return res.status(404).json({
                success: false,
                message: "Field excursion not found"
            });
        }

        return res.status(200).json({
            success: true,
            excursion
        });
    } catch (error) {
        console.error("Get excursion by id error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch excursion details"
        });
    }
};

/**
 * 6. START EXCURSION: PLANNED -> ACTIVE
 */
export const startExcursion = async (req, res) => {
    try {
        const excursion = await FieldExcursion.findById(req.params.id);
        if (!excursion) {
            return res.status(404).json({
                success: false,
                message: "Field excursion not found"
            });
        }

        if (excursion.status !== "PLANNED") {
            return res.status(400).json({
                success: false,
                message: `Only PLANNED excursions can be started. Current status is ${excursion.status}`
            });
        }

        excursion.status = "ACTIVE";
        excursion.departureTime = new Date();
        await excursion.save();

        const populated = await FieldExcursion.findById(excursion._id)
            .populate("stationId", "name code stationType")
            .populate({
                path: "leaderId",
                populate: { path: "userId", select: "name employeeId email role designation" }
            })
            .populate({
                path: "members",
                populate: { path: "userId", select: "name employeeId email role designation" }
            });

        return res.status(200).json({
            success: true,
            message: "Excursion started successfully.",
            excursion: populated
        });
    } catch (error) {
        console.error("Start excursion error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to start excursion"
        });
    }
};

/**
 * 7. MARK EXCURSION RETURNED: ACTIVE or OVERDUE -> COMPLETED
 */
export const markExcursionReturned = async (req, res) => {
    try {
        const excursion = await FieldExcursion.findById(req.params.id);
        if (!excursion) {
            return res.status(404).json({
                success: false,
                message: "Field excursion not found"
            });
        }

        if (!["ACTIVE", "OVERDUE"].includes(excursion.status)) {
            return res.status(400).json({
                success: false,
                message: `Only ACTIVE or OVERDUE excursions can be marked as returned. Current status is ${excursion.status}`
            });
        }

        excursion.status = "COMPLETED";
        excursion.actualReturnTime = new Date();
        await excursion.save();

        const populated = await FieldExcursion.findById(excursion._id)
            .populate("stationId", "name code stationType")
            .populate({
                path: "leaderId",
                populate: { path: "userId", select: "name employeeId email role designation" }
            })
            .populate({
                path: "members",
                populate: { path: "userId", select: "name employeeId email role designation" }
            });

        return res.status(200).json({
            success: true,
            message: `Excursion ${excursion.excursionNumber} marked as returned.`,
            excursion: populated
        });
    } catch (error) {
        console.error("Mark returned error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to mark excursion as returned"
        });
    }
};

/**
 * 8. CANCEL EXCURSION: PLANNED -> CANCELLED
 */
export const cancelExcursion = async (req, res) => {
    try {
        const excursion = await FieldExcursion.findById(req.params.id);
        if (!excursion) {
            return res.status(404).json({
                success: false,
                message: "Field excursion not found"
            });
        }

        if (excursion.status !== "PLANNED") {
            return res.status(400).json({
                success: false,
                message: `Only PLANNED excursions can be cancelled. Current status is ${excursion.status}`
            });
        }

        excursion.status = "CANCELLED";
        await excursion.save();

        return res.status(200).json({
            success: true,
            message: "Excursion cancelled successfully.",
            excursion
        });
    } catch (error) {
        console.error("Cancel excursion error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to cancel excursion"
        });
    }
};

/**
 * 9. SUBMIT FIELD CHECK-IN (Personnel)
 * Logged-in Personnel submits check-in.
 * Backend verifies membership.
 */
export const submitFieldCheckIn = async (req, res) => {
    try {
        const { id: excursionId } = req.params;
        const {
            location,
            latitude,
            longitude,
            temperature,
            batteryLevel,
            networkAvailable = true,
            notes,
            deviceId,
            eventId,
            offlineCreated = false
        } = req.body;

        // 1. Resolve Personnel identity from authenticated user
        const personnel = await Personnel.findOne({ userId: req.user.userId });
        if (!personnel) {
            return res.status(403).json({
                success: false,
                message: "No personnel profile associated with this user"
            });
        }

        // 2. Validate Excursion
        const excursion = await FieldExcursion.findById(excursionId);
        if (!excursion) {
            return res.status(404).json({
                success: false,
                message: "Field excursion not found"
            });
        }

        // 3. Status must be ACTIVE or OVERDUE
        if (!["ACTIVE", "OVERDUE"].includes(excursion.status)) {
            return res.status(400).json({
                success: false,
                message: `Check-in is only allowed for ACTIVE or OVERDUE excursions. Current status: ${excursion.status}`
            });
        }

        // 4. Verify Membership (leader or member)
        const isLeader = excursion.leaderId?.toString() === personnel._id.toString();
        const isMember = excursion.members?.some(m => m?.toString() === personnel._id.toString());
        if (!isLeader && !isMember) {
            return res.status(403).json({
                success: false,
                message: "You are not assigned to this excursion."
            });
        }

        // 5. Idempotency Check with eventId
        if (eventId) {
            const existing = await FieldCheckIn.findOne({ eventId });
            if (existing) {
                return res.status(200).json({
                    success: true,
                    message: "Check-in already recorded (idempotent)",
                    checkIn: existing
                });
            }
        }

        // 6. Coordinates extraction
        const lat = Number(location?.latitude ?? location?.lat ?? latitude ?? 0);
        const lng = Number(location?.longitude ?? location?.lng ?? longitude ?? 0);

        // 7. Create Check-In
        const checkIn = await FieldCheckIn.create({
            excursionId: excursion._id,
            personnelId: personnel._id,
            location: { latitude: lat, longitude: lng },
            temperature: temperature !== undefined && temperature !== "" ? Number(temperature) : null,
            batteryLevel: batteryLevel !== undefined && batteryLevel !== "" ? Number(batteryLevel) : null,
            networkAvailable: Boolean(networkAvailable),
            notes: notes || "",
            deviceId: deviceId || "web-browser",
            eventId: eventId || `CHK-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
            offlineCreated: Boolean(offlineCreated),
            syncStatus: offlineCreated ? "PENDING" : "SYNCED"
        });

        const populated = await FieldCheckIn.findById(checkIn._id)
            .populate({
                path: "personnelId",
                populate: { path: "userId", select: "name employeeId email role designation" }
            });

        return res.status(201).json({
            success: true,
            message: "Check-in submitted successfully.",
            checkIn: populated
        });
    } catch (error) {
        console.error("Submit field check-in error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to submit field check-in"
        });
    }
};

/**
 * 10. GET ALL CHECK-INS FOR EXCURSION
 * Sorted newest first
 */
export const getExcursionCheckIns = async (req, res) => {
    try {
        const checkIns = await FieldCheckIn.find({ excursionId: req.params.id })
            .populate({
                path: "personnelId",
                populate: { path: "userId", select: "name employeeId email role designation" }
            })
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: checkIns.length,
            checkIns
        });
    } catch (error) {
        console.error("Get excursion check-ins error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch check-ins"
        });
    }
};

/**
 * 11. GET LATEST CHECK-IN PER MEMBER + CHECK-IN DELAY CALCULATION
 */
export const getLatestCheckIns = async (req, res) => {
    try {
        const excursion = await FieldExcursion.findById(req.params.id)
            .populate({
                path: "leaderId",
                populate: { path: "userId", select: "name employeeId email role designation" }
            })
            .populate({
                path: "members",
                populate: { path: "userId", select: "name employeeId email role designation" }
            });

        if (!excursion) {
            return res.status(404).json({
                success: false,
                message: "Field excursion not found"
            });
        }

        const intervalMs = (excursion.checkInIntervalMinutes || 60) * 60 * 1000;
        const now = Date.now();

        // Team members: Leader first, then members
        const teamList = [
            { doc: excursion.leaderId, isLeader: true },
            ...(excursion.members || []).map(m => ({ doc: m, isLeader: false }))
        ].filter(t => t.doc);

        const memberStatuses = await Promise.all(
            teamList.map(async ({ doc, isLeader }) => {
                const latestCheckIn = await FieldCheckIn.findOne({
                    excursionId: excursion._id,
                    personnelId: doc._id
                }).sort({ createdAt: -1 });

                let isDelayed = false;
                let expectedNextCheckIn = null;

                if (["ACTIVE", "OVERDUE"].includes(excursion.status)) {
                    if (latestCheckIn) {
                        const checkInTime = new Date(latestCheckIn.createdAt).getTime();
                        expectedNextCheckIn = new Date(checkInTime + intervalMs);
                        if (now - checkInTime > intervalMs) {
                            isDelayed = true;
                        }
                    } else if (excursion.departureTime) {
                        const depTime = new Date(excursion.departureTime).getTime();
                        expectedNextCheckIn = new Date(depTime + intervalMs);
                        if (now - depTime > intervalMs) {
                            isDelayed = true;
                        }
                    }
                }

                return {
                    personnelId: doc._id,
                    name: doc.userId?.name || "Unknown Personnel",
                    employeeId: doc.userId?.employeeId,
                    designation: doc.userId?.designation,
                    isLeader,
                    latestCheckIn: latestCheckIn ? {
                        id: latestCheckIn._id,
                        time: latestCheckIn.createdAt,
                        temperature: latestCheckIn.temperature,
                        batteryLevel: latestCheckIn.batteryLevel,
                        location: latestCheckIn.location,
                        notes: latestCheckIn.notes,
                        networkAvailable: latestCheckIn.networkAvailable,
                        offlineCreated: latestCheckIn.offlineCreated
                    } : null,
                    isDelayed,
                    expectedNextCheckIn
                };
            })
        );

        return res.status(200).json({
            success: true,
            excursionNumber: excursion.excursionNumber,
            status: excursion.status,
            intervalMinutes: excursion.checkInIntervalMinutes,
            members: memberStatuses
        });
    } catch (error) {
        console.error("Get latest check-ins error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to compute team check-in statuses"
        });
    }
};
