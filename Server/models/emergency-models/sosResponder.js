import mongoose from "mongoose";

const SOSResponderSchema = new mongoose.Schema(
  {
    sosId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SOS",
      required: true,
      index: true
    },
    personnelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Personnel",
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true
    },
    role: {
      type: String,
      required: true
    },
    designation: {
      type: String,
      default: ""
    },
    qualificationMatch: {
      type: String,
      enum: ["HIGHLY_QUALIFIED", "QUALIFIED", "GENERAL"],
      default: "GENERAL"
    },
    status: {
      type: String,
      enum: [
        "RESPONDING",
        "ON_THE_WAY",
        "ON_SITE",
        "ASSISTING",
        "STOOD_DOWN"
      ],
      default: "RESPONDING",
      index: true
    },
    assigned: {
      type: Boolean,
      default: false
    },
    teamId: {
      type: String,
      default: "UNASSIGNED"
    },
    teamName: {
      type: String,
      default: "Not Formally Assigned"
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    assignedAt: Date,
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point"
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0]
      },
      latitude: Number,
      longitude: Number,
      accuracy: Number,
      isAvailable: {
        type: Boolean,
        default: true
      },
      capturedAt: {
        type: Date,
        default: Date.now
      }
    },
    distanceKm: {
      type: Number,
      default: null
    },
    notes: {
      type: String,
      default: ""
    },
    volunteeredAt: {
      type: Date,
      default: Date.now
    },
    lastLocationUpdate: {
      type: Date,
      default: Date.now
    },
    statusUpdatedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Compound unique index prevents same personnel from duplicate volunteering on same SOS
SOSResponderSchema.index({ sosId: 1, userId: 1 }, { unique: true });
SOSResponderSchema.index({ sosId: 1, status: 1 });
SOSResponderSchema.index({ "location.coordinates": "2dsphere" });

export default mongoose.model("SOSResponder", SOSResponderSchema);
