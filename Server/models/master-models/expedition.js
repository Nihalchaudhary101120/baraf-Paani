// mtlb yatara vala hai ye 
import mongoose from "mongoose";

const ScientificProjectSchema = new mongoose.Schema({
  title: { type: String, required: true },
  principalInvestigator: String,
  institution: String,
  discipline: String,
  objectives: String,
  duration: String,
  station: { type: mongoose.Schema.Types.ObjectId, ref: "Station" },
  equipmentRequired: [String],
  fieldExcursionsRequired: { type: Number, default: 0 },
  estimatedCargoKg: { type: Number, default: 0 },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "Personnel" }],
  status: {
    type: String,
    enum: ["PROPOSED", "APPROVED", "ACTIVE", "COMPLETED"],
    default: "PROPOSED"
  }
}, { _id: true });

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

  // Base Stations — actual ObjectId refs now
  stations: [{
    stationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Station"
    },
    deploymentType: {
      type: String,
      enum: ["PRIMARY", "SECONDARY", "SCIENTIFIC", "LOGISTICS"],
      default: "PRIMARY"
    }
  }],

  // Expedition Leadership
  leadership: {
    expeditionLeader: { type: mongoose.Schema.Types.ObjectId, ref: "Personnel" },
    deputyLeader: { type: mongoose.Schema.Types.ObjectId, ref: "Personnel" },
    logisticsLead: { type: mongoose.Schema.Types.ObjectId, ref: "Personnel" },
    medicalOfficer: { type: mongoose.Schema.Types.ObjectId, ref: "Personnel" }
  },

  // Scientific Research Projects
  scientificProjects: [ScientificProjectSchema],

  // Summary counters (denormalised for quick read)
  summary: {
    personnelCount: { type: Number, default: 0 },
    cargoManifestCount: { type: Number, default: 0 },
    projectCount: { type: Number, default: 0 },
    transportConfigured: { type: Boolean, default: false }
  },

  status: {
    type: String,
    enum: [
      "PLANNING",
      "APPROVED",
      "ACTIVE",
      "COMPLETED"
    ],
    default: "PLANNING"
  }

}, { timestamps: true });

export default mongoose.models.Expedition || mongoose.model("Expedition", ExpeditionSchema);