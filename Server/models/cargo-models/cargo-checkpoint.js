//this is for the chain of custody 
//At every scan,
//a new CargoCheckpoint document is created.

import mongoose from "mongoose";

const CargoCheckpointSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      unique: true,
      sparse: true
    },

    manifestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CargoManifest",
      required: true
    },

    shipmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shipment"
    },

    itemCode: {
      type: String,
      required: true
    },

    checkpoint: {
      name: {
        type: String,
        required: true
      },

      type: {
        type: String,
        enum: [
          "WAREHOUSE",
          "PORT",
          "SHIP",
          "STATION",
          "FIELD"
        ]
      },

      location: String
    },

    scannedQuantity: Number,

    condition: {
      type: String,
      enum: [
        "GOOD",
        "DAMAGED",
        "SEALED",
        "OPENED"
      ],
      default: "GOOD"
    },

//yaha par ayega logistic officer jo user se uth ke ayega 
    scannedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },

    deviceId: String,

    //maan lo satellite connection lost ho gaya to ab scan hua to offline me chla jayega;
    //after the network return 
    //LOCAL
    // ↓
    //PENDING
    // ↓
    //SYNCED

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

CargoCheckpointSchema.index({
  manifestId: 1,
  createdAt: 1
});

CargoCheckpointSchema.index({ syncStatus: 1 });

export default mongoose.model("CargoCheckpoint", CargoCheckpointSchema);