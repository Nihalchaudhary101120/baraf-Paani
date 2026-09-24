
import mongoose from "mongoose";

const PersonnelSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true
    },

    dateOfBirth: Date,

    gender: {
      type: String,
      enum: ["Male", "Female", "Other"]
    },

    nationality: {
      type: String,
      default: "Indian"
    },

    maritalStatus: String,

    profilePhoto: String,

    contact: {
      alternateEmail: String,
      alternateMobile: String,

      residentialAddress: {
        addressLine: String,
        city: String,
        state: String,
        postalCode: String,
        country: String
      }
    },

    organization: {
      department: String,
      designation: String,
      employmentStatus: String
    },

    passport: {
      passportNumber: {
        type: String,
        uppercase: true
      },
      passportType: String,
      issueDate: Date,
      expiryDate: Date,
      placeOfIssue: String
    },

    emergencyContact: {
      name: String,
      relation: String,
      phone: String,
      address: String
    },

    expedition: {
      expeditionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Expedition"
      },

      participationType: {
        type: String,
        enum: ["SUMMER", "WINTER"]
      },

      assignedStation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Station"
      },

      joiningDate: Date,

      expectedReturnDate: Date
    },

    previousExpeditions: [{
       type:mongoose.Schema.Types.ObjectId,
       ref:"Expedition",
       default:null
      }
    ],

    status: {
      type: String,
      enum: [
        "REGISTERED",
        "TRAINING",
        "READY",
        "IN_TRANSIT",
        "AT_STATION",
        "RETURNED"
      ],
      default: "REGISTERED"
    }
  },
  {
    timestamps: true
  }
);

PersonnelSchema.index({ "passport.passportNumber": 1 });

export default mongoose.model("Personnel", PersonnelSchema);