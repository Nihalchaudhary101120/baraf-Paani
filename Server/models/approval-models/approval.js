
import mongoose from "mongoose";

const ApprovalSchema = new mongoose.Schema(
  {
    personnelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Personnel",
      required: true
    },

    expeditionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Expedition",
      required: true
    },

    approvalType: {
      type: String,
      enum: [
        "MEDICAL",
        "TRAINING",
        "PASSPORT",
        "SECURITY",
        "HQ_FINAL"
      ],
      required: true
    },

    status: {
      type: String,
      enum: [
        "PENDING",
        "APPROVED",
        "REJECTED"
      ],
      default: "PENDING"
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },

    approvalDate: Date,

    remarks: String,

    version: {
      type: Number,
      default: 1
    }
  },
  {
    timestamps: true
  }
);

ApprovalSchema.index({
  personnelId: 1,
  expeditionId: 1,
  approvalType: 1
});

export default mongoose.model("Approval", ApprovalSchema);