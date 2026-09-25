import MedicalAssessment from "../models/approval-models/medical-assessment.js";
import Personnel from "../models/master-models/personnel.js";
import Expedition from "../models/master-models/expedition.js"

export const createMedicalAssessment = async (req, res) => {
    try {
        const {
            personnelId,
            expeditionId,
            examinationDate
        } = req.body;

        if (!personnelId || !expeditionId || !examinationDate) {
            return res.status(400).json({
                success: false,
                message: "Personnel, expedition and examination date are required"
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

        const existingAssessment = await MedicalAssessment.findOne({
            personnelId,
            expeditionId
        });

        if (existingAssessment) {
            return res.status(409).json({
                success: false,
                message: "Medical assessment already exists for this expedition"
            });
        }

        const assessment = await MedicalAssessment.create({
            personnelId,
            expeditionId,
            examinationDate,
            examiningOfficer: req.user.userId
        });

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



export const getMedicalAssessment = async (req, res) => {
    try {
        const { id } = req.params;

        const assessment = await MedicalAssessment.findById(id)
            .populate("personnelId")
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
            psychologicalAssessment
        } = req.body;

        if (examinationDate !== undefined) {
            assessment.examinationDate = examinationDate;
        }

        if (physical !== undefined) {
            assessment.physical = physical;
        }

        if (medicalHistory !== undefined) {
            assessment.medicalHistory = medicalHistory;
        }

        if (vaccinations !== undefined) {
            assessment.vaccinations = vaccinations;
        }

        if (laboratoryTests !== undefined) {
            assessment.laboratoryTests = laboratoryTests;
        }

        if (psychologicalAssessment !== undefined) {
            assessment.psychologicalAssessment = psychologicalAssessment;
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

export const updateClearance = async (req, res) => {
    try {
        const { id } = req.params;

        const {
            status,
            restrictions,
            remarks
        } = req.body;

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
                message: "Restrictions are required for this clearance status"
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

        await assessment.save();

        return res.status(200).json({
            success: true,
            message: "Medical clearance updated successfully",
            clearance: assessment.clearance
        });

    } catch (error) {
        console.error("Update medical clearance error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to update medical clearance"
        });
    }
};

