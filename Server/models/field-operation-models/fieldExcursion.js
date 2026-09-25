
import mongoose from "mongoose";

const FieldExcursionSchema = new mongoose.Schema(
  {
    excursionNumber: {
      type: String,
      unique: true,
      required: true
    },

    expeditionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Expedition",
      required: true
    },

    stationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Station",
      required: true
    },

    leaderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Personnel",
      required: true
    },

    members: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Personnel"
    }],

    eventId: {
      type: String,
      unique: true,
      sparse: true,
      index: true
    },

    purpose: {
      type: String,
      required: true
    },

    destination: {
      name: String,
      coordinates: {
        latitude: Number,
        longitude: Number
      }
    },

    transportMode: {
      type: String,
      enum: [
        "SNOWMOBILE",
        "TRACK_VEHICLE",
        "HELICOPTER",
        "FOOT"
      ]
    },


    departureTime: Date,
    expectedReturnTime: Date,
    actualReturnTime: Date,

    checkInIntervalMinutes: {
      type: Number,
      default: 60
    },

    weatherRisk: {
      type: String,
      enum: [
        "LOW",
        "MEDIUM",
        "HIGH"
      ]
    },

    status: {
      type: String,
      enum: [
        "PLANNED",
        "ACTIVE",
        "OVERDUE",
        "COMPLETED",
        "CANCELLED"
      ],
      default: "PLANNED"
    }
  },
  {
    timestamps: true
  }
);

FieldExcursionSchema.index({ status: 1 });
FieldExcursionSchema.index({ stationId: 1 });

export default mongoose.model("FieldExcursion", FieldExcursionSchema);