
import mongoose from "mongoose";

const MedicalAssessmentSchema = new mongoose.Schema(
  {
    personnelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Personnel",
      required: true
    },

    expeditionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Expedition",
      required: true
    },

    formCode: {
      type: String,
      default: "AL-2205"
    },

    examinationDate: {
      type: Date,
      required: true
    },

    examiningOfficer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    physical: {
      heightCm: Number,
      weightKg: Number,
      bloodPressure: String,
      pulseRate: Number,
      oxygenSaturation: Number,
      chestMeasurementCm: Number,
      vision: {
        leftEye: String,
        rightEye: String
      },
      hearing: String
    },

    medicalHistory: {
      allergies: [String],
      chronicDiseases: [String],
      previousSurgeries: [String],
      currentMedications: [String]
    },

    vaccinations: {
      tetanus: Boolean,
      hepatitisA: Boolean,
      hepatitisB: Boolean,
      influenza: Boolean,
      covid19: Boolean,
      others: [String]
    },

    laboratoryTests: {
      bloodGroup: String,
      hemoglobin: Number,
      bloodSugar: Number,
      ecgStatus: String,
      xrayStatus: String
    },

    psychologicalAssessment: {
      stressTolerance: String,
      isolationFitness: String,
      remarks: String
    },

    clearance: {
      status: {
        type: String,
        enum: [
          "PENDING",
          "FIT",
          "FIT_WITH_RESTRICTIONS",
          "NOT_FIT"
        ],
        default: "PENDING"
      },

      restrictions: [String],

      remarks: String
    }
  },
  {
    timestamps: true
  }
);

MedicalAssessmentSchema.index({ personnelId: 1, expeditionId: 1 });

export default mongoose.model("MedicalAssessment", MedicalAssessmentSchema);