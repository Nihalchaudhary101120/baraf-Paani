
import mongoose from "mongoose";

const CargoItemSchema = new mongoose.Schema(
  {
    itemCode: {
      type: String,
      required: true
    },

    boxCode: {
      type: String
    },

    skuId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SKU"
    },

    skuCode: {
      type: String
    },

    itemName: {
      type: String
    },

    description: {
      type: String,
      required: true
    },

    category: {
      type: String,
      enum: [
        "FOOD",
        "FUEL",
        "MEDICAL",
        "SCIENTIFIC",
        "PERSONAL",
        "SPARES",
        "ELECTRONICS",
        "EQUIPMENT",
        "SAFETY",
        "GENERAL"
      ],
      default: "GENERAL"
    },

    make: String,
    manufacturer: String,
    model: String,
    serialNumber: String,
    serialNumbers: [String],

    quantity: {
      type: Number,
      default: 1
    },

    unit: {
      type: String,
      default: "PCS"
    },

    packageCount: {
      type: Number,
      default: 1
    },

    packageType: {
      type: String,
      enum: [
        "BOX",
        "CRATE",
        "PALLET",
        "CYLINDER",
        "CONTAINER",
        "BAG"
      ],
      default: "BOX"
    },

    unitWeightKg: {
      type: Number,
      default: 0
    },

    weightKg: {
      type: Number,
      required: true
    },

    dimensions: {
      length: Number,
      width: Number,
      height: Number,
      unit: { type: String, default: "cm" }
    },

    unitDeclaredValue: {
      type: Number,
      default: 0
    },

    declaredValueINR: Number,

    specialHandling: {
      type: String,
      enum: ["NORMAL", "FRAGILE", "PRIORITY", "SECURE", "REFRIGERATED", "HAZMAT"],
      default: "NORMAL"
    },

    temperatureRequirement: {
      type: String,
      enum: ["AMBIENT", "COLD_STORAGE", "FREEZER", "CRYOGENIC"],
      default: "AMBIENT"
    },

    hazardous: {
      type: Boolean,
      default: false
    },

    notes: {
      type: String,
      default: ""
    },

    status: {
      type: String,
      enum: ["CREATED", "PACKED", "LOADED", "IN_TRANSIT", "RECEIVED"],
      default: "PACKED"
    },

    qrCode: String
  }
);

const CargoManifestSchema = new mongoose.Schema(
  {
    manifestNumber: {
      type: String,
      unique: true,
      required: true
    },

    expeditionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Expedition",
      required: true
    },

    declarationType: {
      type: String,
      enum: [
        "OFFICIAL",
        "PERSONAL",
        "SCIENTIFIC",
        "SCIENTIFIC_SAMPLES",
        "EQUIPMENT",
        "CONSUMABLES",
        "MEDICAL",
        "HAZMAT"
      ],
      default: "OFFICIAL"
    },

    owner: {
      personnelId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Personnel"
      },
      organization: String
    },

    origin: {
      type: String,
      default: "Goa"
    },

    destination: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Station",
      required: true
    },

    shipmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shipment"
    },

    items: [CargoItemSchema],

    totals: {
      totalPackages: Number,
      totalWeightKg: Number,
      totalDeclaredValue: Number
    },

    description: String,

    status: {
      type: String,
      enum: [
        "CREATED",
        "PACKED",
        "DISPATCHED",
        "IN_TRANSIT",
        "DELIVERED"
      ],
      default: "CREATED"
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

CargoManifestSchema.index({ expeditionId: 1 });
CargoManifestSchema.index({ status: 1 });

export default mongoose.model("CargoManifest", CargoManifestSchema);