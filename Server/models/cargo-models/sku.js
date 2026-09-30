import mongoose from "mongoose";

const SKUSchema = new mongoose.Schema(
  {
    skuCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    itemName: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: [
        "SCIENTIFIC",
        "MEDICAL",
        "ELECTRONICS",
        "FOOD",
        "SPARES",
        "FUEL",
        "EQUIPMENT",
        "SAFETY",
        "PERSONAL",
        "GENERAL",
      ],
      required: true,
      default: "GENERAL",
    },
    subcategory: {
      type: String,
      trim: true,
      default: "",
    },
    description: {
      type: String,
      default: "",
    },
    unit: {
      type: String,
      enum: [
        "PCS",
        "KIT",
        "BOX",
        "KG",
        "LITRE",
        "LTR",
        "CYLINDER",
        "BAG",
        "SET",
        "PALLET",
        "PKT",
        "UNITS",
      ],
      default: "PCS",
    },
    manufacturer: {
      type: String,
      trim: true,
      default: "",
    },
    model: {
      type: String,
      trim: true,
      default: "",
    },
    defaultDimensions: {
      length: { type: Number, default: 0 },
      width: { type: Number, default: 0 },
      height: { type: Number, default: 0 },
      unit: { type: String, default: "cm" },
    },
    defaultWeightKg: {
      type: Number,
      default: 1,
      min: 0,
    },
    unitDeclaredValue: {
      type: Number,
      default: 0,
      min: 0,
    },
    trackingType: {
      type: String,
      enum: ["QUANTITY_BASED", "NON-SERIALIZED", "SERIALIZED"],
      default: "QUANTITY_BASED",
    },
    storageType: {
      type: String,
      enum: [
        "WAREHOUSE",
        "RACK",
        "SHELF",
        "COLD_ROOM",
        "HAZMAT_STORE",
        "OUTDOOR_BAY",
        "GENERAL",
      ],
      default: "GENERAL",
    },
    temperatureRequirement: {
      type: String,
      enum: ["AMBIENT", "COLD_STORAGE", "FREEZER", "CRYOGENIC"],
      default: "AMBIENT",
    },
    isHazardous: {
      type: Boolean,
      default: false,
    },
    minStockLevel: {
      type: Number,
      default: 5,
    },
    reorderLevel: {
      type: Number,
      default: 10,
    },
    maxStockLevel: {
      type: Number,
      default: 100,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

SKUSchema.index({ category: 1, status: 1 });

export default mongoose.model("SKU", SKUSchema);
