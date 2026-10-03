import mongoose from "mongoose";

const LocationPointSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point"
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
      default: [0, 0]
    },
    accuracy: {
      type: Number,
      default: null
    },
    capturedAt: {
      type: Date,
      default: Date.now
    },
    addressOrDesc: {
      type: String,
      trim: true
    },
    isAvailable: {
      type: Boolean,
      default: true
    }
  },
  { _id: false }
);

const TimelineEventSchema = new mongoose.Schema(
  {
    event: {
      type: String,
      required: true
    },
    status: {
      type: String
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    performedByName: {
      type: String
    },
    performedByType: {
      type: String,
      enum: ["PERSONNEL", "COMMANDER", "SYSTEM", "RESPONDER"],
      default: "PERSONNEL"
    },
    notes: {
      type: String
    },
    location: {
      coordinates: [Number],
      accuracy: Number
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  { _id: true }
);

const VolunteerSchema = new mongoose.Schema(
  {
    personnelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Personnel"
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    name: {
      type: String,
      required: true
    },
    role: {
      type: String
    },
    designation: {
      type: String
    },
    qualificationMatch: {
      type: String,
      enum: ["HIGHLY_QUALIFIED", "QUALIFIED", "GENERAL"],
      default: "GENERAL"
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point"
      },
      coordinates: {
        type: [Number],
        default: [0, 0]
      },
      accuracy: Number,
      capturedAt: {
        type: Date,
        default: Date.now
      }
    },
    distanceKm: {
      type: Number,
      default: null
    },
    volunteeredAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ["VOLUNTEERED", "ACCEPTED", "DECLINED"],
      default: "VOLUNTEERED"
    },
    notes: String
  },
  { _id: true }
);

const AssignedResponderSchema = new mongoose.Schema(
  {
    personnelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Personnel"
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    name: {
      type: String
    },
    role: {
      type: String
    },
    designation: {
      type: String
    },
    assignedAt: {
      type: Date,
      default: Date.now
    },
    dispatchedAt: Date,
    arrivedAt: Date,
    responderLocation: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point"
      },
      coordinates: {
        type: [Number],
        default: [0, 0]
      },
      accuracy: Number,
      capturedAt: {
        type: Date,
        default: Date.now
      }
    },
    distanceKm: {
      type: Number,
      default: null
    },
    trackingActive: {
      type: Boolean,
      default: false
    }
  },
  { _id: false }
);

const SOSSchema = new mongoose.Schema(
  {
    sosNumber: {
      type: String,
      unique: true,
      required: true,
      index: true
    },

    clientIncidentId: {
      type: String,
      unique: true,
      sparse: true,
      index: true
    },

    expeditionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Expedition",
      required: false,
      index: true
    },

    stationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Station",
      index: true
    },

    excursionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FieldExcursion"
    },

    personnelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Personnel",
      required: false,
      index: true
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },

    triggeredByName: {
      type: String
    },

    triggeredByRole: {
      type: String
    },

    emergencyType: {
      type: String,
      enum: [
        "MEDICAL",
        "FIRE",
        "ACCIDENT",
        "ENVIRONMENTAL",
        "EQUIPMENT_FAILURE",
        "VEHICLE_EMERGENCY",
        "MISSING_PERSON",
        "SECURITY",
        "WEATHER",
        "OTHER"
      ],
      required: true
    },

    severity: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      required: true,
      default: "HIGH"
    },

    location: {
      type: LocationPointSchema,
      required: true,
      default: () => ({
        type: "Point",
        coordinates: [0, 0],
        isAvailable: false
      })
    },

    description: {
      type: String,
      required: true,
      trim: true
    },

    status: {
      type: String,
      enum: [
        "TRIGGERED",
        "ACKNOWLEDGED",
        "ASSESSING",
        "RESPONSE_ASSIGNED",
        "RESPONDER_DISPATCHED",
        "ON_SITE",
        "STABILIZED",
        "RESOLVED",
        "CANCELLED",
        // Legacy backward compatibility
        "OPEN",
        "RESPONDING"
      ],
      default: "TRIGGERED",
      index: true
    },

    volunteers: [VolunteerSchema],

    assignedResponder: {
      type: AssignedResponderSchema,
      default: null
    },

    // Legacy field support
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },

    acknowledgedAt: Date,
    acknowledgedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },

    resolution: {
      resolvedAt: Date,
      resolvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      },
      resolvedByName: String,
      resolutionNotes: String,
      outcome: String
    },

    timeline: [TimelineEventSchema],

    eventId: {
      type: String,
      unique: true,
      sparse: true,
      index: true
    },

    offlineCreated: {
      type: Boolean,
      default: false
    },

    syncStatus: {
      type: String,
      enum: ["LOCAL", "PENDING", "SYNCED"],
      default: "LOCAL"
    },

    deviceId: String
  },
  {
    timestamps: true
  }
);

// Pre-validate hook to handle legacy location format { latitude, longitude }
SOSSchema.pre("validate", function () {
  if (this.location) {
    // If incoming location was plain object with lat/lng
    const rawLoc = this.location;
    if (
      (rawLoc.latitude !== undefined || rawLoc.lat !== undefined) &&
      (!rawLoc.coordinates || rawLoc.coordinates.length === 0 || (rawLoc.coordinates[0] === 0 && rawLoc.coordinates[1] === 0 && !rawLoc.isAvailable))
    ) {
      const lat = Number(rawLoc.latitude ?? rawLoc.lat);
      const lng = Number(rawLoc.longitude ?? rawLoc.lng);
      if (!isNaN(lat) && !isNaN(lng)) {
        this.location = {
          type: "Point",
          coordinates: [lng, lat],
          accuracy: rawLoc.accuracy || null,
          isAvailable: true,
          addressOrDesc: rawLoc.description || rawLoc.addressOrDesc || "",
          capturedAt: rawLoc.capturedAt || new Date()
        };
      }
    }
  }
});

// Indexes for spatial search, active incident filtering, and station lookup
SOSSchema.index({ "location.coordinates": "2dsphere" });
SOSSchema.index({ stationId: 1, status: 1 });
SOSSchema.index({ expeditionId: 1, status: 1 });
SOSSchema.index({ status: 1, severity: 1, createdAt: -1 });

export default mongoose.model("SOS", SOSSchema);