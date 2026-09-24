
import mongoose from "mongoose";

const SOSSchema = new mongoose.Schema(
  {
    sosNumber: {
      type: String,
      unique: true,
      required: true
    },

    expeditionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Expedition",
      required: true
    },

    stationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Station"
    },

    excursionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FieldExcursion"
    },

    personnelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Personnel",
      required: true
    },

    emergencyType: {
      type: String,
      enum: [
        "MEDICAL",
        "WEATHER",
        "ACCIDENT",
        "FIRE",
        "MISSING_PERSON",
        "EQUIPMENT_FAILURE"
      ],
      required: true
    },

    severity: {
      type: String,
      enum: [
        "LOW",
        "MEDIUM",
        "HIGH",
        "CRITICAL"
      ],
      required: true
    },

    location: {
      latitude: Number,
      longitude: Number
    },

    description: String,

    transmissionStatus: {
      type: String,
      enum: [
        "LOCAL_ONLY",
        "QUEUED",
        "TRANSMITTED",
        "ACKNOWLEDGED"
      ],
      default: "LOCAL_ONLY"
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    
     offlineCreated: {
      type: Boolean,
      default: false
    },

    syncStatus: {
      type: String,
      enum: [
        "LOCAL",
        "PENDING",
        "SYNCED"
      ],
      default: "LOCAL"
    },

    status: {
      type: String,
      enum: [
        "OPEN",
        "RESPONDING",
        "RESOLVED"
      ],
      default: "OPEN"
    },

    deviceId: String
  },
  {
    timestamps: true
  }
);

SOSSchema.index({
  status: 1,
  severity: 1
});

export default mongoose.model("SOS", SOSSchema);