
import mongoose from "mongoose";

const PersonnelMovementSchema = new mongoose.Schema(
  {
    personnelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Personnel",
      required: true
    },

    expeditionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Expedition"
    },

    fromLocation: String,
    toLocation: String,

    movementType: {
      type: String,
      enum: [
        "FLIGHT",
        "SHIP",
        "FIELD",
        "STATION_TRANSFER",
        "RETURN"
      ]
    },

    departureTime: Date,
    arrivalTime: Date,

    transportId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transport"
    },

    remarks: String
  },
  {
    timestamps: true
  }
);

PersonnelMovementSchema.index({ personnelId: 1 });

export default mongoose.model("PersonnelMovement", PersonnelMovementSchema);