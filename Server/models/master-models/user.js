
import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  employeeId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },

  name: {
    type: String,
    required: true,
    trim: true

  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },

  phone: {
    type: String,
    trim: true
  },

  password: {
    type: String,
    required: true,
    select: false,
  },

  designation: {
    type: String,
    trim: true,
  },

  organization: {
    type: String,
    trim: true,
  },

  role: {
    type: String,
    required: true,
    enum: [
      "HQ_ADMIN",
      "HQ_COMMAND",
      "LOGISTICS_OFFICER",
      "STATION_COMMANDER",
      "STATION_OPERATOR",
      "INVENTORY_MANAGER",
      "MEDICAL_OFFICER",
      "CARGO_OFFICER",
      "SHIP_OFFICER",
      "FLIGHT_OFFICER",
      "SCIENTIST"
    ],
  },

  permissions: {
    type: [String],
    default: []
  },

  stationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Station",
    default: null
  },

  isActive: {
    type: Boolean,
    default: true
  },
  
  lastLogin: {
    type: Date,
  },


}, { timestamps: true });

UserSchema.index({ role: 1 });
UserSchema.index({ stationId: 1 });

export default mongoose.model("User", UserSchema);