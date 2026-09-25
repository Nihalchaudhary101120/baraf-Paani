// mtlb yatara vala hai ye 
import mongoose from "mongoose";

const ExpeditionSchema = new mongoose.Schema({

  expeditionCode: {
    type: String,
    unique: true
  },

  name: String,
  year: Number,

  season: {
    type: String,
    enum: ["SUMMER", "WINTER"]
  },

  startDate: Date,
  endDate: Date,

  stations: [{
    stationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Station"
    },

    deploymentType: String
  }],

  status: {
    type: String,
    enum: [
      "PLANNING",
      "APPROVED",
      "ACTIVE",
      "COMPLETED"
    ]
  }

}, { timestamps: true });

export default mongoose.models.Expedition || mongoose.model("Expedition", ExpeditionSchema);