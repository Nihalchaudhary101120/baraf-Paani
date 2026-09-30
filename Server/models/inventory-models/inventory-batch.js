import mongoose from "mongoose";

/**
 * InventoryBatch — one batch per cargo item received at a station.
 *
 * This is the FCFS layer. Every time a cargo manifest is delivered,
 * one InventoryBatch document is created per CargoItem.
 *
 * Idempotency key: { stationId, sourceManifestId, sourceCargoItemId }
 * This compound unique index prevents duplicate receipts if the manifest
 * is marked DELIVERED multiple times.
 */
const InventoryBatchSchema = new mongoose.Schema(
  {
    stationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Station",
      required: true
    },

    skuId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SKU"
    },

    // Denormalized for audit — survives SKU updates
    skuCode: {
      type: String,
      trim: true,
      uppercase: true
    },

    itemName: {
      type: String,
      trim: true
    },

    category: {
      type: String,
      enum: [
        "FOOD", "FUEL", "MEDICAL", "SCIENTIFIC",
        "PERSONAL", "SPARES", "ELECTRONICS",
        "EQUIPMENT", "SAFETY", "GENERAL"
      ],
      default: "GENERAL"
    },

    unit: {
      type: String,
      default: "PCS"
    },

    receivedQuantity: {
      type: Number,
      required: true,
      min: 0
    },

    remainingQuantity: {
      type: Number,
      required: true,
      min: 0
    },

    // Source linkage — idempotency + audit
    sourceManifestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CargoManifest",
      required: true
    },

    sourceManifestNumber: {
      type: String,
      trim: true
    },

    // The _id of the CargoItem subdocument inside the manifest
    sourceCargoItemId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },

    receivedAt: {
      type: Date,
      default: Date.now
    },

    expiryDate: {
      type: Date
    },

    status: {
      type: String,
      enum: ["AVAILABLE", "DEPLETED", "BLOCKED"],
      default: "AVAILABLE"
    }
  },
  {
    timestamps: true
  }
);

// ── Idempotency — prevents duplicate receipt from same cargo item ──
InventoryBatchSchema.index(
  { stationId: 1, sourceManifestId: 1, sourceCargoItemId: 1 },
  { unique: true }
);

// ── FCFS query: find batches for a SKU at a station, sorted by age ──
InventoryBatchSchema.index({ stationId: 1, skuId: 1, receivedAt: 1 });
InventoryBatchSchema.index({ stationId: 1, skuCode: 1, receivedAt: 1 });

// ── Source lookups ──
InventoryBatchSchema.index({ sourceManifestId: 1 });
InventoryBatchSchema.index({ status: 1, stationId: 1 });

export default mongoose.model("InventoryBatch", InventoryBatchSchema);
