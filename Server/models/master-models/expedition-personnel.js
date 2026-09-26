import mongoose from "mongoose";

const ExpeditionPersonnelSchema = new mongoose.Schema(
  {
    expeditionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Expedition",
      required: true,
      index: true
    },

    personnelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Personnel",
      required: true,
      index: true
    },

    status: {
      type: String,
      enum: ["NOMINATED", "READY_FOR_CONFIRMATION", "CONFIRMED", "REJECTED"],
      default: "NOMINATED",
      index: true
    },

    medicalStatus: {
      type: String,
      enum: ["PENDING", "FIT", "FIT_WITH_RESTRICTIONS", "NOT_FIT"],
      default: "PENDING",
      index: true
    },

    medicalRestrictions: {
      type: [String],
      default: []
    },

    medicalRemarks: {
      type: String,
      default: ""
    },

    trainingStatus: {
      type: String,
      enum: ["PENDING", "PARTIAL", "COMPLETED"],
      default: "PENDING",
      index: true
    },

    participationType: {
      type: String,
      enum: ["SUMMER", "WINTER"],
      default: "WINTER"
    },

    assignedStation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Station"
    },

    nominatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },

    nominatedAt: {
      type: Date,
      default: Date.now
    },

    confirmedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },

    confirmedAt: {
      type: Date
    },

    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },

    rejectedAt: {
      type: Date
    },

    remarks: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

// Compound unique index so each candidate is associated uniquely per expedition
ExpeditionPersonnelSchema.index({ expeditionId: 1, personnelId: 1 }, { unique: true });

export default mongoose.model("ExpeditionPersonnel", ExpeditionPersonnelSchema);
