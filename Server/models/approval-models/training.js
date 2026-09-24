
import mongoose from "mongoose";

const TrainingRecordSchema = new mongoose.Schema(
  {
    trainingName: {
      type: String,
      required: true
    },

    category: {
      type: String,
      enum: [
        "SURVIVAL",
        "FIRE",
        "RADIO",
        "MEDICAL",
        "FIELD",
        "ENVIRONMENT",
        "EQUIPMENT"
      ],
      required: true
    },

    completedOn: Date,

    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },

    certificateNumber: String,

    validUntil: Date,

    passed: {
      type: Boolean,
      default: false
    }
  },
  { _id: false }
);

const TrainingClearanceSchema = new mongoose.Schema(
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

    trainings: [TrainingRecordSchema],

    overallStatus: {
      type: String,
      enum: [
        "PENDING",
        "PARTIAL",
        "COMPLETED"
      ],
      default: "PENDING"
    },

    finalClearedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },

    clearanceDate: Date
  },
  {
    timestamps: true
  }
);

TrainingClearanceSchema.index({ personnelId: 1 });

export default mongoose.model("TrainingClearance", TrainingClearanceSchema);