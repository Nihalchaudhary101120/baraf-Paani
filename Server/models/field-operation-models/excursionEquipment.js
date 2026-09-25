import mongoose from "mongoose";

const ExcursionEquipmentSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      unique: true,
      sparse: true,
      index: true
    },

    excursionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FieldExcursion",
      required: true
    },

    inventoryItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InventoryItem",
      required: true
    },

    quantityIssued: {
      type: Number,
      required: true,
      min: 1
    },

    quantityReturned: {
      type: Number,
      default: 0,
      min: 0
    },

    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Personnel",
      required: true
    },

    issuedAt: {
      type: Date,
      default: Date.now
    },

    returnedAt: Date,

    returnCondition: {
      type: String,
      enum: [
        "GOOD",
        "DAMAGED",
        "LOST",
        "PARTIALLY_RETURNED"
      ]
    },

    remarks: String,

    deviceId: String,

    offlineCreated: {
      type: Boolean,
      default: false
    },

    syncStatus: {
      type: String,
      enum: ["LOCAL", "PENDING", "SYNCED"],
      default: "LOCAL"
    }
  },
  {
    timestamps: true
  }
);

// Indexes
ExcursionEquipmentSchema.index({ excursionId: 1 });
ExcursionEquipmentSchema.index({ inventoryItemId: 1 });
ExcursionEquipmentSchema.index({ syncStatus: 1 });

export default mongoose.model(
  "ExcursionEquipment",
  ExcursionEquipmentSchema
);