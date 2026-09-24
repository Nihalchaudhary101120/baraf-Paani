
import mongoose from "mongoose";

const InventoryItemSchema = new mongoose.Schema(
  {
    

    itemCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },

    name: {
      type: String,
      required: true,
      trim: true
    },

    category: {
      type: String,
      enum: [
        "FOOD",
        "FUEL",
        "MEDICAL",
        "SCIENTIFIC",
        "SPARES",
        "ELECTRONICS",
        "SAFETY",
        "GENERAL"
      ],
      required: true
    },

    stationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Station",
      required: true
    },

    unit: {
      type: String,
      enum: [
        "KG",
        "LITRE",
        "BOX",
        "PCS",
        "CYLINDER",
        "BAG",
        "SET"
      ],
      required: true
    },

    currentStock: {
      type: Number,
      default: 0,
      min: 0
    },

    minimumStock: {
      type: Number,
      required: true,
      default: 10
    },

    criticalStock: {
      type: Number,
      required: true,
      default: 5
    },

    maximumCapacity: Number,

    storageLocation: {
      warehouse: String,
      rack: String,
      shelf: String,
      room: String
    },

    supplier: {
      name: String,
      contact: String
    },

    expiryTracking: {
      type: Boolean,
      default: false
    },

    defaultShelfLifeDays: Number,

    status: {
      type: String,
      enum: [
        "AVAILABLE",
        "LOW_STOCK",
        "CRITICAL",
        "OUT_OF_STOCK"
      ],
      default: "AVAILABLE"
    }
  },
  {
    timestamps: true
  }
);

InventoryItemSchema.index({ stationId: 1, category: 1 });
InventoryItemSchema.index({ status: 1 });

export default mongoose.model("InventoryItem", InventoryItemSchema);