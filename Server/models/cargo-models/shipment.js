
import mongoose from "mongoose";

const ShipmentSchema = new mongoose.Schema(
  {
    shipmentNumber: {
      type: String,
      unique: true,
      required: true
    },

    expeditionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Expedition",
      required: true
    },

    transportId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transport",
      required: true
    },

    route: {
      origin: {
        type: String,
        default: "Goa"
      },

      transitPoints: [
        {
          name: String,
          arrival: Date,
          departure: Date
        }
      ],

      destination: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Station"
      }
    },

    departureDate: Date,

    estimatedArrival: Date,

    actualArrival: Date,

    cargoCount: {
      type: Number,
      default: 0
    },

    totalWeightKg: {
      type: Number,
      default: 0
    },

    description: String,

    vesselName: String,

    status: {
      type: String,
      enum: [
        "SCHEDULED",
        "LOADING",
        "AT_SEA",
        "ARRIVED",
        "COMPLETED"
      ],
      default: "SCHEDULED"
    }
  },
  {
    timestamps: true
  }
);

ShipmentSchema.index({ status: 1 });

export default mongoose.model("Shipment", ShipmentSchema);