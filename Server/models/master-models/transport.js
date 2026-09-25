import mongoose from "mongoose";

const TransportSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },

    code: {
      type: String,
      unique: true,
      sparse: true
    },

    type: {
      type: String,
      enum: ["SHIP", "AIRCRAFT", "HELICOPTER", "SNOWCAT", "TRUCK", "OTHER"],
      default: "SHIP"
    },

    capacityKg: Number,

    passengerCapacity: Number,

    status: {
      type: String,
      enum: ["AVAILABLE", "IN_TRANSIT", "MAINTENANCE", "DECOMMISSIONED"],
      default: "AVAILABLE"
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.models.Transport || mongoose.model("Transport", TransportSchema);