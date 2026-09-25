import mongoose from "mongoose";

const StationSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },

    name: {
      type: String,
      required: true,
      trim: true
    },

    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point"
      },

      coordinates: {
        type: [Number],
        default: [70.7667, -11.7333] // Longitude, Latitude
      },

      elevationMeters: {
        type: Number,
        default: 130
      }
    },

    stationType: {
      type: String,
      enum: ["INLAND", "COASTAL", "HEADQUARTERS"],
      default: "COASTAL"
    },

    capacity: {
      summer: { type: Number, default: 40 },
      winter: { type: Number, default: 25 },
      emergency: { type: Number, default: 60 }
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

export default mongoose.models.Station || mongoose.model("Station", StationSchema);