import mongoose from "mongoose";
import MedicalAssessment from "../models/approval-models/medical-assessment.js";
import TrainingClearance from "../models/approval-models/training.js";
import Personnel from "../models/master-models/personnel.js";
import Expedition from "../models/master-models/expedition.js";
import User from "../models/master-models/user.js";
import Station from "../models/master-models/station.js";
import ExpeditionPersonnel from "../models/master-models/expedition-personnel.js";

// Helper to resolve expeditionId or expeditionCode to ObjectId
const resolveExpeditionId = async (expId) => {
    if (!expId || expId === "ALL" || expId === "All") return null;
    if (mongoose.Types.ObjectId.isValid(expId)) {
        return expId;
    }
    const exp = await Expedition.findOne({ expeditionCode: expId });
    return exp ? exp._id : null;
};

// =====================================================
// GET ALL MEDICAL ASSESSMENTS (WITH FILTERS & SEARCH)
// =====================================================
export const getAllMedicalAssessments = async (req, res) => {
    try {
        const { expeditionId, status, search, stationId } = req.query;

        const query = {};
        const resolvedExpId = await resolveExpeditionId(expeditionId);
        if (resolvedExpId) {
            query.expeditionId = resolvedExpId;
        }
        if (status && status !== "All" && status !== "ALL") {
            query["clearance.status"] = status;
        }

        let assessments = await MedicalAssessment.find(query)
            .populate({
                path: "personnelId",
                populate: [
                    { path: "userId", select: "name employeeId email role designation organization stationId" },
                    { path: "expedition.assignedStation", select: "name code type" }
                ]
            })
            .populate("expeditionId", "expeditionCode missionTitle season year status")
            .populate("examiningOfficer", "name employeeId email")
            .sort({ examinationDate: -1, updatedAt: -1 });

        // Apply in-memory search and station filter if needed for deep population
        if (search) {
            const s = search.toLowerCase();
            assessments = assessments.filter(a => {
                const user = a.personnelId?.userId;
                const passport = a.personnelId?.passport?.passportNumber || "";
                return (
                    user?.name?.toLowerCase().includes(s) ||
                    user?.employeeId?.toLowerCase().includes(s) ||
                    user?.email?.toLowerCase().includes(s) ||
                    passport.toLowerCase().includes(s)
                );
            });
        }

        if (stationId && stationId !== "All" && stationId !== "ALL") {
            assessments = assessments.filter(a => {
                const assignedStation = a.personnelId?.expedition?.assignedStation?._id?.toString() ||
                                        a.personnelId?.userId?.stationId?.toString();
                return assignedStation === stationId;
            });
        }

        return res.status(200).json({
            success: true,
            count: assessments.length,
            assessments
        });
    } catch (error) {
        console.error("Get all medical assessments error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch medical assessments"
        });
    }
};

// =====================================================
// GET MEDICAL OVERVIEW METRICS & ALERTS
// =====================================================
export const getMedicalOverviewStats = async (req, res) => {
    try {
        const { expeditionId } = req.query;

        // Fetch all expeditions for frontend options
        const expeditions = await Expedition.find().select("expeditionCode name year season status").sort({ year: -1 }).lean();

        let activeExpedition = null;
        if (expeditionId && expeditionId !== "ALL" && expeditionId !== "All") {
            if (mongoose.Types.ObjectId.isValid(expeditionId)) {
                activeExpedition = await Expedition.findById(expeditionId);
            } else {
                activeExpedition = await Expedition.findOne({ expeditionCode: expeditionId });
            }
        }
        if (!activeExpedition) {
            activeExpedition = await Expedition.findOne({ status: "ACTIVE" }) || await Expedition.findOne().sort({ createdAt: -1 });
        }

        const expFilter = activeExpedition ? { expeditionId: activeExpedition._id } : {};

        // Fetch all personnel
        const allPersonnel = await Personnel.find()
            .populate("userId", "name employeeId email role designation organization stationId isActive")
            .populate("expedition.assignedStation", "name code")
            .lean();

        // Fetch assessments for current expedition
        const assessments = await MedicalAssessment.find(expFilter)
            .populate({
                path: "personnelId",
                populate: { path: "userId", select: "name employeeId email role stationId" }
            })
            .populate("expeditionId", "expeditionCode missionTitle")
            .lean();

        // Fetch trainings for current expedition
        const trainings = await TrainingClearance.find(expFilter).lean();

        // Compute counts
        const totalPersonnelCount = allPersonnel.length;
        let fitCount = 0;
        let restrictedCount = 0;
        let notFitCount = 0;
        let pendingMedicalCount = 0;

        // Map by personnelId
        const assessmentMap = new Map();
        assessments.forEach(a => {
            const pId = a.personnelId?._id?.toString() || a.personnelId?.toString();
            if (pId) {
                assessmentMap.set(pId, a);
                const status = a.clearance?.status;
                if (status === "FIT") fitCount++;
                else if (status === "FIT_WITH_RESTRICTIONS") restrictedCount++;
                else if (status === "NOT_FIT") notFitCount++;
                else pendingMedicalCount++;
            }
        });

        // Personnel who don't even have an assessment record yet are pending
        allPersonnel.forEach(p => {
            if (!assessmentMap.has(p._id.toString())) {
                pendingMedicalCount++;
            }
        });

        // Training stats
        let trainingCompletedCount = 0;
        let trainingPartialCount = 0;
        let trainingPendingCount = 0;

        trainings.forEach(t => {
            if (t.overallStatus === "COMPLETED") trainingCompletedCount++;
            else if (t.overallStatus === "PARTIAL") trainingPartialCount++;
            else trainingPendingCount++;
        });

        allPersonnel.forEach(p => {
            const hasTraining = trainings.some(t => t.personnelId?.toString() === p._id.toString());
            if (!hasTraining) {
                trainingPendingCount++;
            }
        });

        // Critical Alerts calculation
        const alerts = [];

        assessments.forEach(a => {
            const name = a.personnelId?.userId?.name || "Personnel";
            const empId = a.personnelId?.userId?.employeeId || "NCP";

            if (a.clearance?.status === "FIT_WITH_RESTRICTIONS") {
                alerts.push({
                    id: `restr-${a._id}`,
                    type: "RESTRICTION",
                    severity: "WARNING",
                    title: "Medical Restrictions Active",
                    message: `${name} (${empId}) cleared with restrictions: ${(a.clearance.restrictions || []).join(", ") || "Modified duties"}`,
                    personnelId: a.personnelId?._id,
                    expeditionCode: a.expeditionId?.expeditionCode
                });
            }

            if (a.clearance?.status === "NOT_FIT") {
                alerts.push({
                    id: `notfit-${a._id}`,
                    type: "NOT_FIT",
                    severity: "DANGER",
                    title: "Declared Unfit for Deployment",
                    message: `${name} (${empId}) declared NOT FIT for Antarctic deployment.`,
                    personnelId: a.personnelId?._id,
                    expeditionCode: a.expeditionId?.expeditionCode
                });
            }

            // Check incomplete vaccinations
            const vac = a.vaccinations || {};
            const missingVaccines = [];
            if (!vac.tetanus) missingVaccines.push("Tetanus");
            if (!vac.hepatitisA) missingVaccines.push("Hep A");
            if (!vac.hepatitisB) missingVaccines.push("Hep B");
            if (!vac.influenza) missingVaccines.push("Influenza");
            if (!vac.covid19) missingVaccines.push("COVID-19");

            if (missingVaccines.length > 0) {
                alerts.push({
                    id: `vac-${a._id}`,
                    type: "VACCINATION",
                    severity: "WARNING",
                    title: "Incomplete Vaccinations",
                    message: `${name} (${empId}) missing ${missingVaccines.join(", ")} booster`,
                    personnelId: a.personnelId?._id
                });
            }

            // Check examination age / clearance expiry
            if (a.examinationDate) {
                const examDate = new Date(a.examinationDate);
                const expiryDate = new Date(examDate.getTime() + 365 * 24 * 60 * 60 * 1000);
                const diffDays = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));
                if (diffDays <= 30 && diffDays > 0) {
                    alerts.push({
                        id: `exp-${a._id}`,
                        type: "EXPIRY",
                        severity: "CRITICAL",
                        title: "Medical Clearance Expiring Soon",
                        message: `Clearance for ${name} (${empId}) expires in ${diffDays} days`,
                        personnelId: a.personnelId?._id
                    });
                }
            }
        });

        // Station-wise breakdown
        const stationStats = {
            Maitri: { total: 0, fit: 0, restricted: 0, pending: 0, notFit: 0 },
            Bharati: { total: 0, fit: 0, restricted: 0, pending: 0, notFit: 0 }
        };

        allPersonnel.forEach(p => {
            const stationName = p.expedition?.assignedStation?.name || "Maitri";
            const isBharati = stationName.toLowerCase().includes("bharati");
            const target = isBharati ? stationStats.Bharati : stationStats.Maitri;
            target.total++;

            const a = assessmentMap.get(p._id.toString());
            if (!a || !a.clearance || a.clearance.status === "PENDING") target.pending++;
            else if (a.clearance.status === "FIT") target.fit++;
            else if (a.clearance.status === "FIT_WITH_RESTRICTIONS") target.restricted++;
            else if (a.clearance.status === "NOT_FIT") target.notFit++;
        });

        return res.status(200).json({
            success: true,
            activeExpedition,
            expeditions,
            stats: {
                totalPersonnel: totalPersonnelCount,
                pendingMedical: pendingMedicalCount,
                medicallyFit: fitCount,
                restrictions: restrictedCount,
                notFit: notFitCount,
                trainingPending: trainingPendingCount,
                trainingCompleted: trainingCompletedCount,
                trainingPartial: trainingPartialCount
            },
            stationStats,
            alerts: alerts.slice(0, 15),
            recentAssessments: assessments.slice(0, 6)
        });
    } catch (error) {
        console.error("Get medical overview stats error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to generate medical overview metrics"
        });
    }
};

// =====================================================
// GET COMBINED PERSONNEL MEDICAL ROSTER
// =====================================================
export const getPersonnelMedicalRoster = async (req, res) => {
    try {
        const { expeditionId, status, stationId, search } = req.query;

        const resolvedExpId = await resolveExpeditionId(expeditionId);

        // Source of truth: only personnel nominated to this expedition
        const candidateQuery = resolvedExpId ? { expeditionId: resolvedExpId } : {};
        const candidates = await ExpeditionPersonnel.find(candidateQuery)
            .populate({
                path: "personnelId",
                populate: [
                    { path: "userId", select: "name employeeId email phone role designation organization stationId isActive" },
                    { path: "expedition.assignedStation", select: "name code" }
                ]
            })
            .populate("expeditionId", "expeditionCode missionTitle season year")
            .populate("assignedStation", "name code")
            .lean();

        const personnelIds = candidates.map(c =>
            c.personnelId?._id || c.personnelId
        ).filter(Boolean);

        const assessments = await MedicalAssessment.find(
            resolvedExpId
                ? { expeditionId: resolvedExpId }
                : { personnelId: { $in: personnelIds } }
        )
            .populate("expeditionId", "expeditionCode")
            .populate("examiningOfficer", "name employeeId")
            .lean();

        const trainings = await TrainingClearance.find(
            resolvedExpId
                ? { expeditionId: resolvedExpId }
                : { personnelId: { $in: personnelIds } }
        ).lean();

        // Build composite records from nominated candidates
        const roster = candidates.map(cand => {
            const p = cand.personnelId || {};
            const pId = (p._id || cand.personnelId)?.toString();

            const pAssessments = assessments.filter(a =>
                (a.personnelId?._id || a.personnelId)?.toString() === pId
            );
            const currentAssessment = resolvedExpId
                ? pAssessments.find(a => (a.expeditionId?._id || a.expeditionId)?.toString() === resolvedExpId.toString()) || pAssessments[0]
                : pAssessments[0];

            const pTrainings = trainings.filter(t =>
                (t.personnelId?._id || t.personnelId)?.toString() === pId
            );
            const currentTraining = resolvedExpId
                ? pTrainings.find(t => (t.expeditionId?._id || t.expeditionId)?.toString() === resolvedExpId.toString()) || pTrainings[0]
                : pTrainings[0];

            const userInfo = p.userId || {};

            return {
                candidateId: cand._id,
                personnelId: p._id || cand.personnelId,
                nominationStatus: cand.status,
                participationType: cand.participationType,
                user: {
                    _id: userInfo._id,
                    name: userInfo.name || "Unknown",
                    employeeId: userInfo.employeeId || "—",
                    email: userInfo.email || "",
                    phone: userInfo.phone || "",
                    role: userInfo.role || "PERSONNEL",
                    designation: userInfo.designation || "",
                    organization: userInfo.organization || "",
                    stationId: userInfo.stationId
                },
                passport: p.passport || {},
                expedition: {
                    ...(p.expedition || {}),
                    assignedStation: cand.assignedStation || p.expedition?.assignedStation || null
                },
                previousExpeditions: p.previousExpeditions || [],
                medicalAssessment: currentAssessment || null,
                medicalStatus: currentAssessment?.clearance?.status || cand.medicalStatus || "PENDING",
                trainingClearance: currentTraining || null,
                trainingStatus: currentTraining?.overallStatus || cand.trainingStatus || "PENDING",
                lastExaminationDate: currentAssessment?.examinationDate || null
            };
        });

        // Filter
        let filtered = roster;
        if (status && status !== "ALL" && status !== "All") {
            filtered = filtered.filter(item => item.medicalStatus === status);
        }
        if (search) {
            const s = search.toLowerCase();
            filtered = filtered.filter(item =>
                item.user?.name?.toLowerCase().includes(s) ||
                item.user?.employeeId?.toLowerCase().includes(s) ||
                item.user?.email?.toLowerCase().includes(s) ||
                item.passport?.passportNumber?.toLowerCase().includes(s)
            );
        }

        return res.status(200).json({
            success: true,
            count: filtered.length,
            roster: filtered
        });
    } catch (error) {
        console.error("Get personnel medical roster error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch personnel medical roster"
        });
    }
};

// =====================================================
// GET NOMINATED CANDIDATES FOR MEDICAL OFFICER DROPDOWN
// Returns nominees for an expedition so the Medical
// Officer can select who to create an assessment for
// =====================================================
export const getNominatedCandidates = async (req, res) => {
    try {
        const { expeditionId } = req.query;
        const resolvedExpId = await resolveExpeditionId(expeditionId);

        const query = resolvedExpId
            ? { expeditionId: resolvedExpId, status: { $in: ["NOMINATED", "READY_FOR_CONFIRMATION"] } }
            : { status: { $in: ["NOMINATED", "READY_FOR_CONFIRMATION"] } };

        const candidates = await ExpeditionPersonnel.find(query)
            .populate({
                path: "personnelId",
                populate: { path: "userId", select: "name employeeId email role designation stationId" }
            })
            .populate("expeditionId", "expeditionCode missionTitle season year")
            .populate("assignedStation", "name code")
            .lean();

        const result = candidates.map(cand => {
            const p = cand.personnelId || {};
            const user = p.userId || {};
            return {
                candidateId: cand._id,
                personnelId: p._id || cand.personnelId,
                nominationStatus: cand.status,
                medicalStatus: cand.medicalStatus,
                expedition: cand.expeditionId,
                station: cand.assignedStation,
                user: {
                    name: user.name || "Unknown",
                    employeeId: user.employeeId || "—",
                    email: user.email || "",
                    role: user.role || "PERSONNEL",
                    designation: user.designation || ""
                }
            };
        });

        return res.status(200).json({
            success: true,
            count: result.length,
            candidates: result
        });
    } catch (error) {
        console.error("Get nominated candidates error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch nominated candidates"
        });
    }
};

// =====================================================
// GET HISTORICAL MEDICAL RECORDS FOR A SINGLE PERSON
// =====================================================
export const getPersonnelMedicalHistory = async (req, res) => {
    try {
        const { personnelId } = req.params;

        const assessments = await MedicalAssessment.find({ personnelId })
            .populate("expeditionId", "expeditionCode missionTitle season year")
            .populate("examiningOfficer", "name employeeId email")
            .sort({ examinationDate: -1 });

        const trainings = await TrainingClearance.find({ personnelId })
            .populate("expeditionId", "expeditionCode missionTitle season year")
            .populate("trainings.instructor", "name employeeId")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            assessments,
            trainings
        });
    } catch (error) {
        console.error("Get personnel medical history error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch personnel medical history"
        });
    }
};

// =====================================================
// CREATE MEDICAL ASSESSMENT
// =====================================================
export const createMedicalAssessment = async (req, res) => {
    try {
        const {
            personnelId,
            expeditionId,
            examinationDate,
            physical,
            medicalHistory,
            vaccinations,
            laboratoryTests,
            psychologicalAssessment,
            clearance
        } = req.body;

        if (!personnelId) {
            return res.status(400).json({
                success: false,
                message: "Personnel is required"
            });
        }

        let targetExpId = await resolveExpeditionId(expeditionId);
        if (!targetExpId) {
            const active = await Expedition.findOne({ status: "ACTIVE" }) || await Expedition.findOne();
            if (active) targetExpId = active._id;
        }

        const personnel = await Personnel.findById(personnelId);
        if (!personnel) {
            return res.status(404).json({
                success: false,
                message: "Personnel not found"
            });
        }

        let assessment = await MedicalAssessment.findOne({
            personnelId,
            expeditionId: targetExpId
        });

        const officerId = req.user?.userId || req.user?._id || personnel.userId;

        if (assessment) {
            // Update existing
            if (examinationDate) assessment.examinationDate = examinationDate;
            if (physical) assessment.physical = physical;
            if (medicalHistory) assessment.medicalHistory = medicalHistory;
            if (vaccinations) assessment.vaccinations = vaccinations;
            if (laboratoryTests) assessment.laboratoryTests = laboratoryTests;
            if (psychologicalAssessment) assessment.psychologicalAssessment = psychologicalAssessment;
            if (clearance) assessment.clearance = clearance;
            if (officerId) assessment.examiningOfficer = officerId;
            await assessment.save();

            // Sync ExpeditionPersonnel
            if (targetExpId) {
                const medStatus = clearance?.status || assessment.clearance?.status || "PENDING";
                const medRestrictions = clearance?.restrictions || assessment.clearance?.restrictions || [];
                const medRemarks = clearance?.remarks || assessment.clearance?.remarks || "";
                const cand = await ExpeditionPersonnel.findOne({ expeditionId: targetExpId, personnelId });
                if (cand) {
                    cand.medicalStatus = medStatus;
                    cand.medicalRestrictions = medRestrictions;
                    cand.medicalRemarks = medRemarks;
                    if (cand.status !== "CONFIRMED" && cand.status !== "REJECTED") {
                        if ((medStatus === "FIT" || medStatus === "FIT_WITH_RESTRICTIONS") && cand.trainingStatus === "COMPLETED") {
                            cand.status = "READY_FOR_CONFIRMATION";
                        } else {
                            cand.status = "NOMINATED";
                        }
                    }
                    await cand.save();
                }
            }

            return res.status(200).json({
                success: true,
                message: "Medical assessment updated successfully",
                assessment
            });
        }

        assessment = await MedicalAssessment.create({
            personnelId,
            expeditionId: targetExpId,
            examinationDate: examinationDate || new Date(),
            examiningOfficer: officerId,
            physical: physical || {},
            medicalHistory: medicalHistory || {},
            vaccinations: vaccinations || {},
            laboratoryTests: laboratoryTests || {},
            psychologicalAssessment: psychologicalAssessment || {},
            clearance: clearance || { status: "PENDING" }
        });

        // Sync ExpeditionPersonnel
        if (targetExpId) {
            const medStatus = clearance?.status || "PENDING";
            const medRestrictions = clearance?.restrictions || [];
            const medRemarks = clearance?.remarks || "";
            const cand = await ExpeditionPersonnel.findOne({ expeditionId: targetExpId, personnelId });
            if (cand) {
                cand.medicalStatus = medStatus;
                cand.medicalRestrictions = medRestrictions;
                cand.medicalRemarks = medRemarks;
                if (cand.status !== "CONFIRMED" && cand.status !== "REJECTED") {
                    if ((medStatus === "FIT" || medStatus === "FIT_WITH_RESTRICTIONS") && cand.trainingStatus === "COMPLETED") {
                        cand.status = "READY_FOR_CONFIRMATION";
                    } else {
                        cand.status = "NOMINATED";
                    }
                }
                await cand.save();
            }
        }

        return res.status(201).json({
            success: true,
            message: "Medical assessment created successfully",
            assessment
        });
    } catch (error) {
        console.error("Create medical assessment error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to create medical assessment"
        });
    }
};

// =====================================================
// GET MEDICAL ASSESSMENT BY ID
// =====================================================
export const getMedicalAssessment = async (req, res) => {
    try {
        const { id } = req.params;

        const assessment = await MedicalAssessment.findById(id)
            .populate({
                path: "personnelId",
                populate: [
                    { path: "userId", select: "name employeeId email phone role designation organization stationId" },
                    { path: "expedition.assignedStation", select: "name code" }
                ]
            })
            .populate("expeditionId")
            .populate("examiningOfficer", "name employeeId email");

        if (!assessment) {
            return res.status(404).json({
                success: false,
                message: "Medical assessment not found"
            });
        }

        return res.status(200).json({
            success: true,
            assessment
        });
    } catch (error) {
        console.error("Get medical assessment error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch medical assessment"
        });
    }
};

// =====================================================
// UPDATE MEDICAL ASSESSMENT
// =====================================================
export const updateMedicalAssessment = async (req, res) => {
    try {
        const { id } = req.params;

        const assessment = await MedicalAssessment.findById(id);
        if (!assessment) {
            return res.status(404).json({
                success: false,
                message: "Medical assessment not found"
            });
        }

        const {
            examinationDate,
            physical,
            medicalHistory,
            vaccinations,
            laboratoryTests,
            psychologicalAssessment,
            clearance
        } = req.body;

        if (examinationDate !== undefined) assessment.examinationDate = examinationDate;
        if (physical !== undefined) assessment.physical = physical;
        if (medicalHistory !== undefined) assessment.medicalHistory = medicalHistory;
        if (vaccinations !== undefined) assessment.vaccinations = vaccinations;
        if (laboratoryTests !== undefined) assessment.laboratoryTests = laboratoryTests;
        if (psychologicalAssessment !== undefined) assessment.psychologicalAssessment = psychologicalAssessment;
        if (clearance !== undefined) assessment.clearance = clearance;

        if (req.user?.userId || req.user?._id) {
            assessment.examiningOfficer = req.user.userId || req.user._id;
        }
        await assessment.save();

        return res.status(200).json({
            success: true,
            message: "Medical assessment updated successfully",
            assessment
        });
    } catch (error) {
        console.error("Update medical assessment error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to update medical assessment"
        });
    }
};

// =====================================================
// UPDATE MEDICAL CLEARANCE
// =====================================================
export const updateClearance = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, restrictions, remarks } = req.body;

        const allowedStatuses = [
            "PENDING",
            "FIT",
            "FIT_WITH_RESTRICTIONS",
            "NOT_FIT"
        ];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid clearance status"
            });
        }

        if (
            status === "FIT_WITH_RESTRICTIONS" &&
            (!restrictions || restrictions.length === 0)
        ) {
            return res.status(400).json({
                success: false,
                message: "Restrictions are required for FIT_WITH_RESTRICTIONS"
            });
        }

        const assessment = await MedicalAssessment.findById(id);
        if (!assessment) {
            return res.status(404).json({
                success: false,
                message: "Medical assessment not found"
            });
        }

        assessment.clearance = {
            status,
            restrictions: restrictions || [],
            remarks: remarks || ""
        };
        if (req.user?.userId || req.user?._id) {
            assessment.examiningOfficer = req.user.userId || req.user._id;
        }

        await assessment.save();

        // Sync ExpeditionPersonnel
        if (assessment.expeditionId && assessment.personnelId) {
            const cand = await ExpeditionPersonnel.findOne({
                expeditionId: assessment.expeditionId,
                personnelId: assessment.personnelId
            });
            if (cand) {
                cand.medicalStatus = status;
                cand.medicalRestrictions = restrictions || [];
                cand.medicalRemarks = remarks || "";
                if (cand.status !== "CONFIRMED" && cand.status !== "REJECTED") {
                    if ((status === "FIT" || status === "FIT_WITH_RESTRICTIONS") && cand.trainingStatus === "COMPLETED") {
                        cand.status = "READY_FOR_CONFIRMATION";
                    } else {
                        cand.status = "NOMINATED";
                    }
                }
                await cand.save();
            }
        }

        return res.status(200).json({
            success: true,
            message: "Medical clearance updated successfully",
            clearance: assessment.clearance,
            assessment
        });
    } catch (error) {
        console.error("Update medical clearance error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to update medical clearance"
        });
    }
};

