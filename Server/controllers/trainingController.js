import TrainingClearance from "../models/trainingClearance.js";
import Personnel from "../models/personnel.js";
import Expedition from "../models/expedition.js";

const allowedCategories = [
    "SURVIVAL",
    "FIRE",
    "RADIO",
    "MEDICAL",
    "FIELD",
    "ENVIRONMENT",
    "EQUIPMENT"
];

const calculateOverallStatus = (trainings) => {
    if (!trainings || trainings.length === 0) {
        return "PENDING";
    }

    const passedCount = trainings.filter(
        training => training.passed === true
    ).length;

    if (passedCount === trainings.length) {
        return "COMPLETED";
    }

    if (passedCount > 0) {
        return "PARTIAL";
    }

    return "PENDING";
};


// =====================================================
// CREATE TRAINING CLEARANCE
// =====================================================

export const createTrainingClearance = async (req, res) => {
    try {
        const {
            personnelId,
            expeditionId
        } = req.body;

        if (!personnelId || !expeditionId) {
            return res.status(400).json({
                success: false,
                message: "Personnel and expedition are required"
            });
        }

        const personnel = await Personnel.findById(personnelId);

        if (!personnel) {
            return res.status(404).json({
                success: false,
                message: "Personnel not found"
            });
        }

        const expedition = await Expedition.findById(expeditionId);

        if (!expedition) {
            return res.status(404).json({
                success: false,
                message: "Expedition not found"
            });
        }

        const existing = await TrainingClearance.findOne({
            personnelId,
            expeditionId
        });

        if (existing) {
            return res.status(409).json({
                success: false,
                message: "Training clearance already exists for this expedition"
            });
        }

        const training = await TrainingClearance.create({
            personnelId,
            expeditionId,
            trainings: [],
            overallStatus: "PENDING"
        });

        return res.status(201).json({
            success: true,
            message: "Training clearance created successfully",
            training
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
// GET TRAINING CLEARANCE
// =====================================================

export const getTrainingClearance = async (req, res) => {
    try {
        const { id } = req.params;

        const training = await TrainingClearance.findById(id)
            .populate(
                "personnelId",
                "userId organization passport status"
            )
            .populate(
                "expeditionId"
            )
            .populate(
                "finalClearedBy",
                "name employeeId email"
            )
            .populate(
                "trainings.instructor",
                "name employeeId email"
            );

        if (!training) {
            return res.status(404).json({
                success: false,
                message: "Training clearance not found"
            });
        }

        return res.status(200).json({
            success: true,
            training
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
// ADD TRAINING RECORD
// =====================================================

export const addTrainingRecord = async (req, res) => {
    try {
        const { id } = req.params;

        const {
            trainingName,
            category,
            completedOn,
            certificateNumber,
            validUntil,
            passed
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

        const training = await TrainingClearance.findById(id);

        if (!training) {
            return res.status(404).json({
                success: false,
                message: "Training clearance not found"
            });
        }

        if (training.overallStatus === "COMPLETED") {
            return res.status(400).json({
                success: false,
                message: "Training clearance has already been completed"
            });
        }

        training.trainings.push({
            trainingName: trainingName.trim(),
            category,
            completedOn,
            instructor: req.user.userId,
            certificateNumber,
            validUntil,
            passed: passed ?? false
        });

        training.overallStatus = calculateOverallStatus(
            training.trainings
        );

        await training.save();

        return res.status(201).json({
            success: true,
            message: "Training record added successfully",
            training
        });

    } catch (error) {
        console.error("Add training record error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to add training record"
        });
    }
};


// =====================================================
// UPDATE TRAINING RECORD
// =====================================================

export const updateTrainingRecord = async (req, res) => {
    try {
        const { id, index } = req.params;

        const trainingIndex = Number(index);

        if (
            !Number.isInteger(trainingIndex) ||
            trainingIndex < 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid training record index"
            });
        }

        const training = await TrainingClearance.findById(id);

        if (!training) {
            return res.status(404).json({
                success: false,
                message: "Training clearance not found"
            });
        }

        if (!training.trainings[trainingIndex]) {
            return res.status(404).json({
                success: false,
                message: "Training record not found"
            });
        }

        if (training.overallStatus === "COMPLETED") {
            return res.status(400).json({
                success: false,
                message: "Training clearance has already been completed"
            });
        }

        const {
            trainingName,
            category,
            completedOn,
            certificateNumber,
            validUntil,
            passed
        } = req.body;

        if (
            category !== undefined &&
            !allowedCategories.includes(category)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid training category"
            });
        }

        const record = training.trainings[trainingIndex];

        if (trainingName !== undefined) {
            record.trainingName = trainingName.trim();
        }

        if (category !== undefined) {
            record.category = category;
        }

        if (completedOn !== undefined) {
            record.completedOn = completedOn;
        }

        if (certificateNumber !== undefined) {
            record.certificateNumber = certificateNumber;
        }

        if (validUntil !== undefined) {
            record.validUntil = validUntil;
        }

        if (passed !== undefined) {
            record.passed = passed;
        }

        record.instructor = req.user.userId;

        training.overallStatus = calculateOverallStatus(
            training.trainings
        );

        await training.save();

        return res.status(200).json({
            success: true,
            message: "Training record updated successfully",
            training
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

        const trainingIndex = Number(index);

        if (
            !Number.isInteger(trainingIndex) ||
            trainingIndex < 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid training record index"
            });
        }

        const training = await TrainingClearance.findById(id);

        if (!training) {
            return res.status(404).json({
                success: false,
                message: "Training clearance not found"
            });
        }

        if (!training.trainings[trainingIndex]) {
            return res.status(404).json({
                success: false,
                message: "Training record not found"
            });
        }

        if (training.overallStatus === "COMPLETED") {
            return res.status(400).json({
                success: false,
                message: "Completed training clearance cannot be modified"
            });
        }

        training.trainings.splice(trainingIndex, 1);

        training.overallStatus = calculateOverallStatus(
            training.trainings
        );

        await training.save();

        return res.status(200).json({
            success: true,
            message: "Training record deleted successfully",
            training
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
// FINAL TRAINING CLEARANCE
// =====================================================

export const completeTrainingClearance = async (req, res) => {
    try {
        const { id } = req.params;

        const training = await TrainingClearance.findById(id);

        if (!training) {
            return res.status(404).json({
                success: false,
                message: "Training clearance not found"
            });
        }

        if (!training.trainings.length) {
            return res.status(400).json({
                success: false,
                message: "No training records found"
            });
        }

        const allPassed = training.trainings.every(
            training => training.passed === true
        );

        if (!allPassed) {
            return res.status(400).json({
                success: false,
                message: "All training records must be passed before final clearance"
            });
        }

        training.overallStatus = "COMPLETED";
        training.finalClearedBy = req.user.userId;
        training.clearanceDate = new Date();

        await training.save();

        return res.status(200).json({
            success: true,
            message: "Training clearance completed successfully",
            training
        });

    } catch (error) {
        console.error("Complete training clearance error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to complete training clearance"
        });
    }
};