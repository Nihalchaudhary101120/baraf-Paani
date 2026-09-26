import mongoose from "mongoose";
import TrainingClearance from "../models/approval-models/training.js";
import Personnel from "../models/master-models/personnel.js";
import Expedition from "../models/master-models/expedition.js";
import ExpeditionPersonnel from "../models/master-models/expedition-personnel.js";

const allowedCategories = [
    "SURVIVAL",
    "FIRE",
    "RADIO",
    "MEDICAL",
    "FIELD",
    "ENVIRONMENT",
    "EQUIPMENT"
];

const resolveExpeditionId = async (expId) => {
    if (!expId || expId === "ALL" || expId === "All") return null;
    if (mongoose.Types.ObjectId.isValid(expId)) {
        return expId;
    }
    const exp = await Expedition.findOne({ expeditionCode: expId });
    return exp ? exp._id : null;
};

const calculateOverallStatus = (trainings, isVerified = false) => {
    if (!trainings || trainings.length === 0) {
        return "PENDING";
    }

    const passedCount = trainings.filter(
        training => training.passed === true || training.status === "PASSED"
    ).length;

    if (passedCount === 0) {
        return "PENDING";
    }

    if (passedCount === trainings.length) {
        // If verified by HQ or explicitly completed
        return isVerified ? "COMPLETED" : "PARTIAL"; // Needs HQ verification to be fully COMPLETED
    }

    return "PARTIAL";
};

// =====================================================
// GET ALL TRAINING CLEARANCES
// =====================================================
export const getAllTrainingClearances = async (req, res) => {
    try {
        const { expeditionId, status } = req.query;
        const query = {};
        if (expeditionId && expeditionId !== "ALL" && expeditionId !== "All") {
            const resolvedExpId = await resolveExpeditionId(expeditionId);
            if (resolvedExpId) {
                query.expeditionId = resolvedExpId;
            }
        }
        if (status && status !== "ALL" && status !== "All") query.overallStatus = status;

        const clearances = await TrainingClearance.find(query)
            .populate({
                path: "personnelId",
                populate: { path: "userId", select: "name employeeId email role designation organization stationId" }
            })
            .populate("expeditionId", "expeditionCode name missionTitle season year")
            .populate("verifiedBy", "name employeeId email role")
            .populate("finalClearedBy", "name employeeId email")
            .populate("trainings.instructor", "name employeeId email")
            .sort({ updatedAt: -1 });

        return res.status(200).json({
            success: true,
            count: clearances.length,
            clearances
        });
    } catch (error) {
        console.error("Get all training clearances error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch training clearances"
        });
    }
};

// =====================================================
// GET OR INITIALIZE CANDIDATE TRAINING CLEARANCE
// =====================================================
export const getCandidateTrainingClearance = async (req, res) => {
    try {
        const { expeditionId, personnelId } = req.params;

        let queryExpId = expeditionId;
        if (!mongoose.Types.ObjectId.isValid(expeditionId)) {
            const exp = await Expedition.findOne({ expeditionCode: expeditionId });
            if (!exp) return res.status(404).json({ success: false, message: "Expedition not found" });
            queryExpId = exp._id;
        }

        let clearance = await TrainingClearance.findOne({
            expeditionId: queryExpId,
            personnelId
        })
            .populate({
                path: "personnelId",
                populate: { path: "userId", select: "name employeeId email role designation organization stationId" }
            })
            .populate("expeditionId", "expeditionCode name missionTitle season year")
            .populate("verifiedBy", "name employeeId email role")
            .populate("trainings.instructor", "name employeeId email");

        // If not found, auto-initialize with standard polar modules
        if (!clearance) {
            const defaultRecords = [
                { category: "SURVIVAL", trainingName: "Antarctic Survival & Glacier Navigation", status: "PENDING", passed: false },
                { category: "FIRE", trainingName: "Station Fire Safety & Firefighting", status: "PENDING", passed: false },
                { category: "RADIO", trainingName: "HF/VHF & Satcom Radio Protocol", status: "PENDING", passed: false },
                { category: "MEDICAL", trainingName: "Polar First Aid & Cold Injury Treatment", status: "PENDING", passed: false },
                { category: "FIELD", trainingName: "Crevasse Rescue & Field Safety", status: "PENDING", passed: false }
            ];

            clearance = await TrainingClearance.create({
                personnelId,
                expeditionId: queryExpId,
                trainings: defaultRecords,
                overallStatus: "PENDING"
            });

            clearance = await TrainingClearance.findById(clearance._id)
                .populate({
                    path: "personnelId",
                    populate: { path: "userId", select: "name employeeId email role designation organization stationId" }
                })
                .populate("expeditionId", "expeditionCode name missionTitle season year");
        }

        return res.status(200).json({
            success: true,
            clearance
        });
    } catch (error) {
        console.error("Get candidate training clearance error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch candidate training clearance"
        });
    }
};

// =====================================================
// ASSIGN REQUIRED TRAINING MODULES (HQ_COMMAND)
// =====================================================
export const assignRequiredTraining = async (req, res) => {
    try {
        const { personnelId, expeditionId, modules } = req.body;

        if (!personnelId || !expeditionId) {
            return res.status(400).json({
                success: false,
                message: "Personnel ID and Expedition ID are required"
            });
        }

        let queryExpId = expeditionId;
        if (!mongoose.Types.ObjectId.isValid(expeditionId)) {
            const exp = await Expedition.findOne({ expeditionCode: expeditionId });
            if (!exp) return res.status(404).json({ success: false, message: "Expedition not found" });
            queryExpId = exp._id;
        }

        let clearance = await TrainingClearance.findOne({
            personnelId,
            expeditionId: queryExpId
        });

        const moduleList = Array.isArray(modules) && modules.length > 0
            ? modules
            : DEFAULT_POLAR_MODULES.slice(0, 5);

        if (!clearance) {
            const initialTrainings = moduleList.map(m => ({
                trainingName: m.trainingName || `${m.category} Training`,
                category: m.category,
                passed: false,
                status: "PENDING"
            }));

            clearance = await TrainingClearance.create({
                personnelId,
                expeditionId: queryExpId,
                trainings: initialTrainings,
                overallStatus: "PENDING"
            });
        } else {
            // Merge or replace modules while keeping existing completed records
            const existingMap = new Map();
            (clearance.trainings || []).forEach(t => {
                existingMap.set(t.category, t);
            });

            const updatedTrainings = moduleList.map(m => {
                if (existingMap.has(m.category)) {
                    const ex = existingMap.get(m.category);
                    return {
                        _id: ex._id,
                        trainingName: m.trainingName || ex.trainingName,
                        category: m.category,
                        completedOn: ex.completedOn,
                        instructor: ex.instructor,
                        instructorName: ex.instructorName,
                        certificateNumber: ex.certificateNumber,
                        validUntil: ex.validUntil,
                        passed: ex.passed,
                        status: ex.status || (ex.passed ? "PASSED" : "PENDING"),
                        remarks: ex.remarks
                    };
                }
                return {
                    trainingName: m.trainingName || `${m.category} Training`,
                    category: m.category,
                    passed: false,
                    status: "PENDING"
                };
            });

            clearance.trainings = updatedTrainings;
            // If overall was COMPLETED but new pending modules added, reset to PARTIAL/PENDING
            const hasPending = clearance.trainings.some(t => !t.passed);
            if (hasPending && clearance.overallStatus === "COMPLETED") {
                clearance.overallStatus = calculateOverallStatus(clearance.trainings, false);
                clearance.verifiedBy = null;
                clearance.verifiedAt = null;
            } else {
                clearance.overallStatus = calculateOverallStatus(clearance.trainings, !!clearance.verifiedAt);
            }
            await clearance.save();
        }

        // Sync ExpeditionPersonnel
        const cand = await ExpeditionPersonnel.findOne({
            expeditionId: queryExpId,
            personnelId
        });
        if (cand) {
            cand.trainingStatus = clearance.overallStatus;
            if (cand.status !== "CONFIRMED" && cand.status !== "REJECTED") {
                if ((cand.medicalStatus === "FIT" || cand.medicalStatus === "FIT_WITH_RESTRICTIONS") && clearance.overallStatus === "COMPLETED") {
                    cand.status = "READY_FOR_CONFIRMATION";
                } else {
                    cand.status = "NOMINATED";
                }
            }
            await cand.save();
        }

        const populated = await TrainingClearance.findById(clearance._id)
            .populate({
                path: "personnelId",
                populate: { path: "userId", select: "name employeeId email role designation organization stationId" }
            })
            .populate("expeditionId", "expeditionCode name missionTitle season year");

        return res.status(200).json({
            success: true,
            message: "Training modules assigned successfully",
            clearance: populated
        });
    } catch (error) {
        console.error("Assign required training error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to assign required training modules"
        });
    }
};

// =====================================================
// CREATE TRAINING CLEARANCE (LEGACY COMPAT)
// =====================================================
export const createTrainingClearance = async (req, res) => {
    try {
        const { personnelId, expeditionId, trainings } = req.body;

        if (!personnelId || !expeditionId) {
            return res.status(400).json({
                success: false,
                message: "Personnel and expedition are required"
            });
        }

        let clearance = await TrainingClearance.findOne({ personnelId, expeditionId });
        if (clearance) {
            return res.status(409).json({
                success: false,
                message: "Training clearance already exists for this expedition",
                clearance
            });
        }

        clearance = await TrainingClearance.create({
            personnelId,
            expeditionId,
            trainings: trainings || [],
            overallStatus: "PENDING"
        });

        return res.status(201).json({
            success: true,
            message: "Training clearance created successfully",
            training: clearance,
            clearance
        });
    } catch (error) {
        console.error("Create training clearance error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to create training clearance"
        });
    }
};

// =====================================================
// GET TRAINING CLEARANCE BY ID
// =====================================================
export const getTrainingClearance = async (req, res) => {
    try {
        const { id } = req.params;

        const training = await TrainingClearance.findById(id)
            .populate({
                path: "personnelId",
                populate: { path: "userId", select: "name employeeId email role designation organization stationId" }
            })
            .populate("expeditionId")
            .populate("verifiedBy", "name employeeId email role")
            .populate("finalClearedBy", "name employeeId email")
            .populate("trainings.instructor", "name employeeId email");

        if (!training) {
            return res.status(404).json({
                success: false,
                message: "Training clearance not found"
            });
        }

        return res.status(200).json({
            success: true,
            training,
            clearance: training
        });
    } catch (error) {
        console.error("Get training clearance error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch training clearance"
        });
    }
};

// =====================================================
// ADD / RECORD TRAINING RESULT (INSTRUCTOR / HQ)
// =====================================================
export const addTrainingRecord = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            trainingName,
            category,
            completedOn,
            instructor,
            instructorName,
            certificateNumber,
            validUntil,
            passed,
            status,
            remarks
        } = req.body;

        if (!trainingName || !category) {
            return res.status(400).json({
                success: false,
                message: "Training name and category are required"
            });
        }

        if (!allowedCategories.includes(category)) {
            return res.status(400).json({
                success: false,
                message: "Invalid training category"
            });
        }

        const clearance = await TrainingClearance.findById(id);
        if (!clearance) {
            return res.status(404).json({
                success: false,
                message: "Training clearance not found"
            });
        }

        const isPassed = passed === true || status === "PASSED";
        const finalStatus = status || (isPassed ? "PASSED" : "FAILED");

        // Check if record for this category already exists in trainings array
        const existingIdx = clearance.trainings.findIndex(t => t.category === category);
        if (existingIdx >= 0) {
            clearance.trainings[existingIdx].trainingName = trainingName.trim();
            clearance.trainings[existingIdx].completedOn = completedOn || new Date();
            clearance.trainings[existingIdx].instructor = instructor || (req.user?.userId ? req.user.userId : undefined);
            clearance.trainings[existingIdx].instructorName = instructorName || req.user?.name || clearance.trainings[existingIdx].instructorName;
            clearance.trainings[existingIdx].certificateNumber = certificateNumber || clearance.trainings[existingIdx].certificateNumber;
            clearance.trainings[existingIdx].validUntil = validUntil || clearance.trainings[existingIdx].validUntil;
            clearance.trainings[existingIdx].passed = isPassed;
            clearance.trainings[existingIdx].status = finalStatus;
            clearance.trainings[existingIdx].remarks = remarks || clearance.trainings[existingIdx].remarks;
        } else {
            clearance.trainings.push({
                trainingName: trainingName.trim(),
                category,
                completedOn: completedOn || new Date(),
                instructor: instructor || (req.user?.userId ? req.user.userId : undefined),
                instructorName: instructorName || req.user?.name,
                certificateNumber,
                validUntil,
                passed: isPassed,
                status: finalStatus,
                remarks
            });
        }

        clearance.overallStatus = calculateOverallStatus(
            clearance.trainings,
            !!clearance.verifiedAt
        );

        await clearance.save();

        // Sync ExpeditionPersonnel
        if (clearance.expeditionId && clearance.personnelId) {
            const cand = await ExpeditionPersonnel.findOne({
                expeditionId: clearance.expeditionId,
                personnelId: clearance.personnelId
            });
            if (cand) {
                cand.trainingStatus = clearance.overallStatus;
                if (cand.status !== "CONFIRMED" && cand.status !== "REJECTED") {
                    if ((cand.medicalStatus === "FIT" || cand.medicalStatus === "FIT_WITH_RESTRICTIONS") && clearance.overallStatus === "COMPLETED") {
                        cand.status = "READY_FOR_CONFIRMATION";
                    } else {
                        cand.status = "NOMINATED";
                    }
                }
                await cand.save();
            }
        }

        const populated = await TrainingClearance.findById(clearance._id)
            .populate({
                path: "personnelId",
                populate: { path: "userId", select: "name employeeId email role designation organization stationId" }
            })
            .populate("expeditionId")
            .populate("verifiedBy", "name employeeId email role")
            .populate("trainings.instructor", "name employeeId email");

        return res.status(201).json({
            success: true,
            message: "Training result recorded successfully",
            training: populated,
            clearance: populated
        });
    } catch (error) {
        console.error("Add training record error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to record training result"
        });
    }
};

// =====================================================
// UPDATE TRAINING RECORD BY INDEX / ID
// =====================================================
export const updateTrainingRecord = async (req, res) => {
    try {
        const { id, index } = req.params;

        const clearance = await TrainingClearance.findById(id);
        if (!clearance) {
            return res.status(404).json({
                success: false,
                message: "Training clearance not found"
            });
        }

        let record = null;
        if (mongoose.Types.ObjectId.isValid(index)) {
            record = clearance.trainings.id(index);
        } else {
            const trainingIndex = Number(index);
            if (Number.isInteger(trainingIndex) && trainingIndex >= 0 && trainingIndex < clearance.trainings.length) {
                record = clearance.trainings[trainingIndex];
            }
        }

        if (!record) {
            return res.status(404).json({
                success: false,
                message: "Training record not found"
            });
        }

        const {
            trainingName,
            category,
            completedOn,
            instructor,
            instructorName,
            certificateNumber,
            validUntil,
            passed,
            status,
            remarks
        } = req.body;

        if (trainingName !== undefined) record.trainingName = trainingName.trim();
        if (category !== undefined && allowedCategories.includes(category)) record.category = category;
        if (completedOn !== undefined) record.completedOn = completedOn;
        if (instructor !== undefined) record.instructor = instructor;
        if (instructorName !== undefined) record.instructorName = instructorName;
        if (certificateNumber !== undefined) record.certificateNumber = certificateNumber;
        if (validUntil !== undefined) record.validUntil = validUntil;
        if (remarks !== undefined) record.remarks = remarks;

        if (passed !== undefined || status !== undefined) {
            const isPassed = passed === true || status === "PASSED";
            record.passed = isPassed;
            record.status = status || (isPassed ? "PASSED" : "FAILED");
        }

        clearance.overallStatus = calculateOverallStatus(
            clearance.trainings,
            !!clearance.verifiedAt
        );

        await clearance.save();

        // Sync ExpeditionPersonnel
        if (clearance.expeditionId && clearance.personnelId) {
            const cand = await ExpeditionPersonnel.findOne({
                expeditionId: clearance.expeditionId,
                personnelId: clearance.personnelId
            });
            if (cand) {
                cand.trainingStatus = clearance.overallStatus;
                if (cand.status !== "CONFIRMED" && cand.status !== "REJECTED") {
                    if ((cand.medicalStatus === "FIT" || cand.medicalStatus === "FIT_WITH_RESTRICTIONS") && clearance.overallStatus === "COMPLETED") {
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
            message: "Training record updated successfully",
            training: clearance,
            clearance
        });
    } catch (error) {
        console.error("Update training record error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to update training record"
        });
    }
};

// =====================================================
// DELETE TRAINING RECORD
// =====================================================
export const deleteTrainingRecord = async (req, res) => {
    try {
        const { id, index } = req.params;

        const clearance = await TrainingClearance.findById(id);
        if (!clearance) {
            return res.status(404).json({
                success: false,
                message: "Training clearance not found"
            });
        }

        if (mongoose.Types.ObjectId.isValid(index)) {
            clearance.trainings.pull({ _id: index });
        } else {
            const trainingIndex = Number(index);
            if (Number.isInteger(trainingIndex) && trainingIndex >= 0 && trainingIndex < clearance.trainings.length) {
                clearance.trainings.splice(trainingIndex, 1);
            } else {
                return res.status(400).json({
                    success: false,
                    message: "Invalid training record index"
                });
            }
        }

        clearance.overallStatus = calculateOverallStatus(
            clearance.trainings,
            !!clearance.verifiedAt
        );

        await clearance.save();

        return res.status(200).json({
            success: true,
            message: "Training record deleted successfully",
            training: clearance,
            clearance
        });
    } catch (error) {
        console.error("Delete training record error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to delete training record"
        });
    }
};

// =====================================================
// HQ_COMMAND VERIFICATION & FINAL TRAINING CLEARANCE
// =====================================================
export const verifyAndCompleteTraining = async (req, res) => {
    try {
        const { id } = req.params;
        const { remarks } = req.body || {};

        const clearance = await TrainingClearance.findById(id);
        if (!clearance) {
            return res.status(404).json({
                success: false,
                message: "Training clearance not found"
            });
        }

        if (!clearance.trainings || clearance.trainings.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No training records found. Assign and record training results first."
            });
        }

        const unpassed = clearance.trainings.filter(t => !t.passed && t.status !== "PASSED");
        if (unpassed.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot verify training clearance. ${unpassed.length} required module(s) are still pending/failed: ${unpassed.map(u => u.trainingName).join(", ")}`
            });
        }

        clearance.overallStatus = "COMPLETED";
        clearance.verifiedBy = req.user?.userId;
        clearance.verifiedAt = new Date();
        clearance.finalClearedBy = req.user?.userId;
        clearance.clearanceDate = new Date();
        if (remarks) clearance.remarks = remarks;

        await clearance.save();

        // Sync ExpeditionPersonnel record
        let isReadyForConfirmation = false;
        if (clearance.expeditionId && clearance.personnelId) {
            const cand = await ExpeditionPersonnel.findOne({
                expeditionId: clearance.expeditionId,
                personnelId: clearance.personnelId
            });
            if (cand) {
                cand.trainingStatus = "COMPLETED";
                if (cand.status !== "CONFIRMED" && cand.status !== "REJECTED") {
                    if (cand.medicalStatus === "FIT" || cand.medicalStatus === "FIT_WITH_RESTRICTIONS") {
                        cand.status = "READY_FOR_CONFIRMATION";
                        isReadyForConfirmation = true;
                    } else {
                        cand.status = "NOMINATED";
                    }
                }
                await cand.save();
            }
        }

        const populated = await TrainingClearance.findById(clearance._id)
            .populate({
                path: "personnelId",
                populate: { path: "userId", select: "name employeeId email role designation organization stationId" }
            })
            .populate("expeditionId", "expeditionCode name missionTitle season year")
            .populate("verifiedBy", "name employeeId email role");

        return res.status(200).json({
            success: true,
            message: `Training clearance verified and completed by HQ Command! ${isReadyForConfirmation ? "Candidate is now READY FOR FINAL CONFIRMATION." : ""}`,
            training: populated,
            clearance: populated,
            isReadyForConfirmation
        });
    } catch (error) {
        console.error("Verify and complete training clearance error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to verify training clearance"
        });
    }
};

// Aliased for backward compatibility
export const completeTrainingClearance = verifyAndCompleteTraining;
