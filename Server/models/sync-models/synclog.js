
import mongoose from "mongoose";

const SyncLogSchema = new mongoose.Schema(
  {
    queueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SyncQueue",
      required: true
    },

    deviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DeviceRegistry"
    },

    stationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Station"
    },

    module: String,

    operation: String,

    documentId: String,

    syncStartedAt: Date,

    syncCompletedAt: Date,

    durationMs: Number,

    result: {
      type: String,
      enum: [
        "SUCCESS",
        "FAILED",
        "SKIPPED"
      ],
      required: true
    },

    errorMessage: String,

    serverVersion: Number
  },
  {
    timestamps: true
  }
);

SyncLogSchema.index({ result: 1 });
SyncLogSchema.index({ stationId: 1 });

export default mongoose.model("SyncLog", SyncLogSchema);