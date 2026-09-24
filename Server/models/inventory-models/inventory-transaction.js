//We never update stock directly. The InventoryItem stores the current stock for fast reads, while every change creates an InventoryTransaction for a complete audit trail.


import mongoose from "mongoose";

const InventoryTransactionSchema = new mongoose.Schema(
  {
    transactionNumber: {
      type: String,
      required: true,
      unique: true
    },

    inventoryItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InventoryItem",
      required: true
    },

    stationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Station",
      required: true
    },

    expeditionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Expedition"
    },

    transactionType: {
      type: String,
      enum: [
        "RECEIPT",
        "CONSUMPTION",
        "TRANSFER_IN",
        "TRANSFER_OUT",
        "ADJUSTMENT",
        "DISPOSAL"
      ],
      required: true
    },

    quantity: {
      type: Number,
      required: true,
      min: 0
    },

    balanceAfterTransaction: Number,

    batchNumber: String,

    expiryDate: Date,

    sourceManifestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CargoManifest"
    },

    fromStation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Station"
    },

    toStation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Station"
    },

    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    deviceId: String,

    eventId: {
      type: String,
      unique: true,
      sparse: true
    },

    offlineCreated: {
      type: Boolean,
      default: false
    },

    syncStatus: {
      type: String,
      enum: [
        "LOCAL",
        "PENDING",
        "SYNCED"
      ],
      default: "LOCAL"
    },

    remarks: String
  },
  {
    timestamps: true
  }
);

InventoryTransactionSchema.index({
  inventoryItemId: 1,
  createdAt: -1
});

InventoryTransactionSchema.index({
  stationId: 1,
  transactionType: 1
});

InventoryTransactionSchema.index({
  syncStatus: 1
});

export default mongoose.model("InventoryTransaction", InventoryTransactionSchema);