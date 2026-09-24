
import mongoose from "mongoose";

const StationSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      enum: ["MAITRI", "BHARATI"],
      required: true,
      unique: true
    },

    name: {
      type: String,
      required: true
    },

    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point"
      },

      coordinates: {
        type: [Number],
        required: true
      },

      elevationMeters: Number
    },

    stationType: {
      type: String,
      enum: ["INLAND", "COASTAL"]
    },

    capacity: {
      summer: Number,
      winter: Number,
      emergency: Number
    },

    facilities: [
      {
        type: String,
        description: String,
        status: {
          type: String,
          enum: ["ACTIVE", "MAINTENANCE", "INACTIVE"],
          default: "ACTIVE"
        }
      }
    ],

    communication: {
      satelliteAvailable: Boolean,
      radioAvailable: Boolean,

      connectionStatus: {
        type: String,
        enum: ["ONLINE", "LIMITED", "OFFLINE"],
        default: "ONLINE"
      },

      lastConnectedAt: Date
    },

    operationalStatus: {
      type: String,
      enum: ["ACTIVE", "MAINTENANCE", "EMERGENCY"],
      default: "ACTIVE"
    },

    lastSyncAt: Date
  },
  {
    timestamps: true
  }
);

StationSchema.index({ location: "2dsphere" });

export default mongoose.model("Station", StationSchema);