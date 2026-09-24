
import mongoose from "mongoose";

const SyncQueueSchema = new mongoose.Schema(
  {
    queueId: {
      type: String,
      required: true,
      unique: true
    },

    deviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DeviceRegistry",
      required: true
    },

    stationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Station"
    },

    module: {
      type: String,
      enum: [
        "INVENTORY",
        "CARGO",
        "FIELD",
        "SOS",
        "PERSONNEL",
        "COMMUNICATION"
      ],
      required: true
    },

    operation: {
      type: String,
      enum: [
        "CREATE",
        "UPDATE",
        "DELETE"
      ],
      required: true
    },

    collectionName: {
      type: String,
      required: true
    },

    documentId: String,

    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },

    priority: {
      type: Number,
      default: 5
    },

    retryCount: {
      type: Number,
      default: 0
    },

    maxRetries: {
      type: Number,
      default: 5
    },

    status: {
      type: String,
      enum: [
        "LOCAL",
        "QUEUED",
        "SYNCING",
        "SYNCED",
        "FAILED"
      ],
      default: "LOCAL"
    },

    lastError: String
  },
  {
    timestamps: true
  }
);

SyncQueueSchema.index({ status: 1, priority: -1 });
SyncQueueSchema.index({ deviceId: 1 });

export default mongoose.model("SyncQueue", SyncQueueSchema);