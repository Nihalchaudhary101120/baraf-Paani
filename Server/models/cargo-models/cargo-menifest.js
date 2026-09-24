
import mongoose from "mongoose";

const CargoItemSchema = new mongoose.Schema(
  {
    itemCode: {
      type: String,
      required: true
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
        "GENERAL"
      ]
    },

    make: String,
    model: String,
    serialNumber: String,

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
      ]
    },

    weightKg: {
      type: Number,
      required: true
    },

    dimensions: {
      length: Number,
      width: Number,
      height: Number
    },

    declaredValueINR: Number,

    hazardous: {
      type: Boolean,
      default: false
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
      enum: ["OFFICIAL", "PERSONAL"],
      required: true
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