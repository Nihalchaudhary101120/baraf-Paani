
import mongoose from "mongoose";

const FieldCheckInSchema = new mongoose.Schema(
  {
    excursionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FieldExcursion",
      required: true
    },

    personnelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Personnel",
      required: true
    },

    location: {
      latitude: Number,
      longitude: Number
    },

    temperature: Number,

    batteryLevel: Number,

    networkAvailable: Boolean,

    notes: String,

    deviceId: String,

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
    }
  },
  {
    timestamps: true
  }
);

FieldCheckInSchema.index({
  excursionId: 1,
  createdAt: -1
});

export default mongoose.model("FieldCheckIn", FieldCheckInSchema);