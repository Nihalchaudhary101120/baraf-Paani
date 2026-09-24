
import mongoose from "mongoose";

const ExpeditionSchema = new mongoose.Schema(
  {
    expeditionCode: {
      type: String,
      required: true,
      unique: true
    },

    name: {
      type: String,
      required: true
    },

    year: {
      type: Number,
      required: true
    },

    season: {
      type: String,
      enum: ["SUMMER", "WINTER"],
      required: true
    },

    startDate: Date,

    endDate: Date,

    stations: [
      {
        stationId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Station"
        },

        deploymentType: {
          type: String,
          enum: ["SUMMER", "WINTER"]
        }
      }
    ],

    transports: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Transport"
      }
    ],

    phases: [
      {
        name: String,

        type: {
          type: String,
          enum: [
            "TRAINING",
            "TRAVEL",
            "DEPLOYMENT",
            "RESUPPLY",
            "RETURN"
          ]
        },

        startDate: Date,

        endDate: Date,

        status: {
          type: String,
          enum: [
            "PENDING",
            "ACTIVE",
            "COMPLETED"
          ]
        }
      }
    ],

    status: {
      type: String,
      enum: [
        "PLANNING",
        "APPROVED",
        "ACTIVE",
        "COMPLETED",
        "CANCELLED"
      ],
      default: "PLANNING"
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

ExpeditionSchema.index({ year: 1, season: 1 });

export default mongoose.model("Expedition", ExpeditionSchema);