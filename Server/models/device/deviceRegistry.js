
import mongoose from "mongoose";

const DeviceRegistrySchema = new mongoose.Schema(
  {
    deviceCode: {
      type: String,
      required: true,
      unique: true
    },

    deviceName: String,

    deviceType: {
      type: String,
      enum: [
        "TABLET",
        "PHONE",
        "LAPTOP",
        "STATION_PC"
      ]
    },

    platform: {
      type: String,
      enum: [
        "ANDROID",
        "WINDOWS",
        "LINUX"
      ]
    },

    stationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Station"
    },

    assignedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },

    appVersion: String,

    lastSyncAt: Date,

    lastSeenAt: Date,

    status: {
      type: String,
      enum: [
        "ONLINE",
        "OFFLINE",
        "INACTIVE"
      ],
      default: "ONLINE"
    }
  },
  {
    timestamps: true
  }
);

DeviceRegistrySchema.index({ stationId: 1 });

export default mongoose.model("DeviceRegistry", DeviceRegistrySchema);