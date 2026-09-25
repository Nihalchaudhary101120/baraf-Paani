
import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true
    },

    message: {
      type: String,
      required: true
    },

    type: {
      type: String,
      enum: [
        "INFO",
        "WARNING",
        "CRITICAL",
        "SUCCESS"
      ],
      required: true
    },

    module: {
      type: String,
      enum: [
        "CARGO",
        "INVENTORY",
        "FIELD",
        "SOS",
        "WEATHER",
        "SYSTEM"
      ]
    },

    recipientUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },

    recipientStation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Station"
    },

    deliveryStatus: {
      type: String,
      enum: [
        "PENDING",
        "DELIVERED",
        "READ"
      ],
      default: "PENDING"
    },

    priority: {
      type: Number,
      default: 3
    }
  },
  {
    timestamps: true
  }
);

NotificationSchema.index({ recipientUser: 1, read: 1 });

export default mongoose.model("Notification", NotificationSchema);