
import mongoose from "mongoose";

const IncidentEventSchema = new mongoose.Schema(
  {
    sosId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SOS",
      required: true
    },

    eventType: {
      type: String,
      enum: [
        "SOS_RECEIVED",
        "TEAM_ASSIGNED",
        "DOCTOR_ALERTED",
        "VEHICLE_DISPATCHED",
        "HELICOPTER_REQUESTED",
        "TEAM_REACHED",
        "PATIENT_EVACUATED",
        "INCIDENT_CLOSED"
      ],
      required: true
    },

    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },

    description: String,

    location: {
      latitude: Number,
      longitude: Number
    }
  },
  {
    timestamps: true
  }
);

IncidentEventSchema.index({
  sosId: 1,
  createdAt: 1
});

export default mongoose.model("IncidentEvent", IncidentEventSchema);