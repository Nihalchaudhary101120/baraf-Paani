import mongoose from "mongoose";
import SOS from "../models/emergency-models/sos.js";
import SOSResponder from "../models/emergency-models/sosResponder.js";
import User from "../models/master-models/user.js";
import Personnel from "../models/master-models/personnel.js";
import Station from "../models/master-models/station.js";
import Expedition from "../models/master-models/expedition.js";
import IncidentEvent from "../models/emergency-models/incidentEvent.js";

// Haversine calculation in km
export const calculateDistanceKm = (lon1, lat1, lon2, lat2) => {
  if (
    typeof lon1 !== "number" ||
    typeof lat1 !== "number" ||
    typeof lon2 !== "number" ||
    typeof lat2 !== "number" ||
    isNaN(lon1) ||
    isNaN(lat1) ||
    isNaN(lon2) ||
    isNaN(lat2)
  ) {
    return null;
  }

  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
};

// Validate coordinates range
export const isValidCoordinates = (lng, lat) => {
  return (
    typeof lng === "number" &&
    typeof lat === "number" &&
    !isNaN(lng) &&
    !isNaN(lat) &&
    lng >= -180 &&
    lng <= 180 &&
    lat >= -90 &&
    lat <= 90
  );
};

// Robust user resolver handling userId, id, _id, email, or role from req.user and req.body
export const resolveUserFromReq = async (req) => {
  const userId =
    req.user?.userId ||
    req.user?._id ||
    req.user?.id ||
    req.user?.user?._id ||
    req.user?.user?.id ||
    req.body?.userId;

  let userDoc = null;
  if (userId) {
    userDoc = await User.findById(userId).lean();
  }
  if (!userDoc && req.user?.email) {
    userDoc = await User.findOne({ email: req.user.email }).lean();
  }
  if (!userDoc && req.user?.employeeId) {
    userDoc = await User.findOne({ employeeId: req.user.employeeId }).lean();
  }
  if (!userDoc && req.user?.role) {
    userDoc = await User.findOne({ role: req.user.role, isActive: true }).lean();
  }
  return { userId: userDoc?._id || userId, userDoc };
};

// Qualification Matcher based on emergency category and responder profile
export const evaluateQualification = (emergencyType, role, designation = "") => {
  const normRole = (role || "").toUpperCase();
  const normDesig = (designation || "").toUpperCase();

  switch (emergencyType) {
    case "MEDICAL":
      if (
        normRole === "MEDICAL_OFFICER" ||
        normDesig.includes("DOCTOR") ||
        normDesig.includes("PHYSICIAN") ||
        normDesig.includes("SURGEON") ||
        normDesig.includes("MEDIC") ||
        normDesig.includes("PARAMEDIC")
      ) {
        return "HIGHLY_QUALIFIED";
      }
      if (
        normDesig.includes("NURSE") ||
        normDesig.includes("FIRST AID") ||
        normDesig.includes("HEALTH") ||
        normRole === "STATION_OPERATOR"
      ) {
        return "QUALIFIED";
      }
      return "GENERAL";

    case "FIRE":
      if (
        normDesig.includes("FIRE") ||
        normDesig.includes("SAFETY") ||
        normRole === "STATION_OPERATOR"
      ) {
        return "HIGHLY_QUALIFIED";
      }
      if (
        normRole === "INVENTORY_MANAGER" ||
        normDesig.includes("ENGINEER") ||
        normDesig.includes("TECH")
      ) {
        return "QUALIFIED";
      }
      return "GENERAL";

    case "EQUIPMENT_FAILURE":
      if (
        normRole === "INVENTORY_MANAGER" ||
        normRole === "STATION_OPERATOR" ||
        normDesig.includes("ENGINEER") ||
        normDesig.includes("ELECTRIC") ||
        normDesig.includes("TECH")
      ) {
        return "HIGHLY_QUALIFIED";
      }
      if (normDesig.includes("OPERATOR") || normRole === "LOGISTICS_OFFICER") {
        return "QUALIFIED";
      }
      return "GENERAL";

    case "VEHICLE_EMERGENCY":
      if (
        normRole === "SHIP_OFFICER" ||
        normRole === "FLIGHT_OFFICER" ||
        normDesig.includes("DRIVER") ||
        normDesig.includes("PILOT") ||
        normDesig.includes("MECHANIC")
      ) {
        return "HIGHLY_QUALIFIED";
      }
      if (normRole === "LOGISTICS_OFFICER" || normRole === "STATION_OPERATOR") {
        return "QUALIFIED";
      }
      return "GENERAL";

    case "WEATHER":
    case "ENVIRONMENTAL":
      if (
        normRole === "SCIENTIST" ||
        normDesig.includes("METEOROLOGIST") ||
        normDesig.includes("ENVIRONMENT")
      ) {
        return "HIGHLY_QUALIFIED";
      }
      if (normRole === "STATION_COMMANDER" || normRole === "STATION_OPERATOR") {
        return "QUALIFIED";
      }
      return "GENERAL";

    case "MISSING_PERSON":
    case "ACCIDENT":
    case "SECURITY":
    default:
      if (
        normRole === "STATION_COMMANDER" ||
        normRole === "MEDICAL_OFFICER" ||
        normDesig.includes("SAFETY") ||
        normDesig.includes("LEAD")
      ) {
        return "HIGHLY_QUALIFIED";
      }
      if (normRole === "STATION_OPERATOR" || normRole === "SCIENTIST") {
        return "QUALIFIED";
      }
      return "GENERAL";
  }
};

/**
 * 1. CREATE SOS INCIDENT
 * POST /api/sos
 */
export const createSOS = async (req, res) => {
  try {
    const {
      clientIncidentId,
      emergencyType,
      severity = "HIGH",
      description,
      latitude,
      longitude,
      accuracy,
      addressOrDesc,
      excursionId,
      stationId: bodyStationId,
      expeditionId: bodyExpeditionId,
      offlineCreated
    } = req.body;

    // Idempotency check: If clientIncidentId provided, check if already recorded
    if (clientIncidentId) {
      const existingSOS = await SOS.findOne({ clientIncidentId })
        .populate("stationId", "name code location")
        .populate("expeditionId", "name expeditionNumber")
        .populate("personnelId")
        .populate("userId", "name role designation email phone")
        .lean();

      if (existingSOS) {
        return res.status(200).json({
          success: true,
          message: `SOS incident already registered (idempotent duplicate request) with ID ${existingSOS.sosNumber}.`,
          sos: existingSOS,
          duplicate: true
        });
      }
    }

    if (!emergencyType) {
      return res.status(400).json({
        success: false,
        message: "Emergency type is required."
      });
    }

    if (!description || !description.trim()) {
      return res.status(400).json({
        success: false,
        message: "Situation description is required."
      });
    }

    // Resolve user and personnel details
    const { userId, userDoc } = await resolveUserFromReq(req);
    if (!userDoc || userDoc.isActive === false) {
      return res.status(403).json({
        success: false,
        message: "User account is not active or authorized to trigger SOS."
      });
    }

    let personnelDoc = await Personnel.findOne({ userId }).lean();

    // Determine station
    let resolvedStationId = bodyStationId || req.user?.stationId || userDoc.stationId || personnelDoc?.expedition?.assignedStation;
    if (!resolvedStationId) {
      const defaultStation = await Station.findOne({ operationalStatus: "ACTIVE" }).lean();
      resolvedStationId = defaultStation?._id || null;
    }

    // Determine expedition
    let resolvedExpeditionId = bodyExpeditionId || personnelDoc?.expedition?.expeditionId;
    if (!resolvedExpeditionId) {
      const activeExpedition = await Expedition.findOne({ status: "ACTIVE" }).lean();
      resolvedExpeditionId = activeExpedition?._id || null;
    }

    // If personnel record is missing, create a fallback or link safely
    let resolvedPersonnelId = personnelDoc?._id;
    if (!resolvedPersonnelId) {
      try {
        const createdPersonnel = await Personnel.create({
          userId,
          status: "AT_STATION",
          profileStatus: "COMPLETED",
          expedition: {
            expeditionId: resolvedExpeditionId,
            assignedStation: resolvedStationId
          }
        });
        resolvedPersonnelId = createdPersonnel._id;
      } catch {
        const fallbackP = await Personnel.findOne({ userId }).lean();
        resolvedPersonnelId = fallbackP?._id || new mongoose.Types.ObjectId();
      }
    }

    // Coordinates handling
    const latNum = parseFloat(latitude);
    const lngNum = parseFloat(longitude);
    const hasValidCoords = isValidCoordinates(lngNum, latNum);

    const locationData = {
      type: "Point",
      coordinates: hasValidCoords ? [lngNum, latNum] : [0, 0],
      accuracy: typeof accuracy === "number" && !isNaN(accuracy) ? accuracy : null,
      capturedAt: new Date(),
      addressOrDesc: addressOrDesc || (hasValidCoords ? "Coordinates detected" : "Location unavailable"),
      isAvailable: hasValidCoords
    };

    // Generate unique SOS number: SOS-YYYY-XXXX
    const currentYear = new Date().getFullYear();
    const countThisYear = await SOS.countDocuments({
      createdAt: {
        $gte: new Date(`${currentYear}-01-01T00:00:00.000Z`),
        $lte: new Date(`${currentYear}-12-31T23:59:59.999Z`)
      }
    });
    const sosNumber = `SOS-${currentYear}-${String(countThisYear + 1).padStart(4, "0")}`;

    const newSOS = new SOS({
      sosNumber,
      clientIncidentId: clientIncidentId || undefined,
      offlineCreated: Boolean(offlineCreated),
      syncStatus: offlineCreated ? "SYNCED" : "LOCAL",
      expeditionId: resolvedExpeditionId,
      stationId: resolvedStationId,
      excursionId: excursionId || null,
      personnelId: resolvedPersonnelId,
      userId,
      triggeredByName: userDoc.name,
      triggeredByRole: userDoc.role,
      emergencyType,
      severity,
      location: locationData,
      description: description.trim(),
      status: "TRIGGERED",
      timeline: [
        {
          event: "SOS_TRIGGERED",
          status: "TRIGGERED",
          performedBy: userId,
          performedByName: userDoc.name,
          performedByType: "PERSONNEL",
          notes: `SOS incident triggered: ${emergencyType} [${severity}]. ${hasValidCoords ? `GPS Location detected (Accuracy: ${locationData.accuracy || "N/A"}m)` : "Location coordinates unavailable at trigger time"}.`,
          location: hasValidCoords ? { coordinates: [lngNum, latNum], accuracy: locationData.accuracy } : undefined,
          timestamp: new Date()
        }
      ]
    });

    await newSOS.save();

    // Also register in IncidentEvent for timeline redundancy
    try {
      await IncidentEvent.create({
        sosId: newSOS._id,
        eventType: "SOS_RECEIVED",
        performedBy: userId,
        description: `SOS ${newSOS.sosNumber}: ${emergencyType} (${severity}) - ${description.substring(0, 120)}`,
        location: hasValidCoords ? { latitude: latNum, longitude: lngNum } : undefined
      });
    } catch (ieErr) {
      console.error("[createSOS] IncidentEvent error:", ieErr.message);
    }

    const populatedSOS = await SOS.findById(newSOS._id)
      .populate("stationId", "name code location")
      .populate("expeditionId", "name expeditionNumber")
      .populate("personnelId")
      .populate("userId", "name role designation email phone")
      .lean();

    return res.status(201).json({
      success: true,
      message: "SOS alert successfully triggered. Station Command and emergency personnel alerted.",
      sos: populatedSOS
    });
  } catch (error) {
    console.error("[createSOS] Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to trigger SOS alert: " + error.message
    });
  }
};

/**
 * 2. GET ACTIVE SOS ALERTS
 * GET /api/sos/active
 */
export const getActiveSOS = async (req, res) => {
  try {
    const { stationId, expeditionId, emergencyType, severity } = req.query;

    const filter = {
      status: { $nin: ["RESOLVED", "CANCELLED"] }
    };

    if (stationId) {
      filter.stationId = stationId;
    }
    if (expeditionId) {
      filter.expeditionId = expeditionId;
    }
    if (emergencyType) {
      filter.emergencyType = emergencyType;
    }
    if (severity) {
      filter.severity = severity;
    }

    const incidents = await SOS.find(filter)
      .populate("stationId", "name code location")
      .populate("expeditionId", "name expeditionNumber")
      .populate("personnelId")
      .populate("userId", "name role designation email phone")
      .populate("volunteers.userId", "name role designation")
      .populate("assignedResponder.userId", "name role designation phone")
      .sort({ createdAt: -1 })
      .lean();

    // Sort by severity priority: CRITICAL > HIGH > MEDIUM > LOW
    const severityWeight = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
    incidents.sort((a, b) => {
      const weightDiff = (severityWeight[b.severity] || 0) - (severityWeight[a.severity] || 0);
      if (weightDiff !== 0) return weightDiff;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    // If client supplied user location, calculate distance to each SOS
    const userLat = parseFloat(req.query.userLat);
    const userLng = parseFloat(req.query.userLng);
    const hasUserCoords = isValidCoordinates(userLng, userLat);

    if (hasUserCoords) {
      incidents.forEach((sos) => {
        if (sos.location?.isAvailable && sos.location.coordinates?.length >= 2) {
          const [sosLng, sosLat] = sos.location.coordinates;
          sos.distanceToUserKm = calculateDistanceKm(userLng, userLat, sosLng, sosLat);
        }
      });
    }

    // Attach active responders from SOSResponder collection
    const sosIds = incidents.map((i) => i._id);
    const activeResponders = await SOSResponder.find({
      sosId: { $in: sosIds },
      status: { $ne: "STOOD_DOWN" }
    })
      .populate("userId", "name role designation email phone")
      .sort({ createdAt: 1 })
      .lean();

    const respondersBySos = {};
    activeResponders.forEach((r) => {
      const sId = r.sosId.toString();
      if (!respondersBySos[sId]) respondersBySos[sId] = [];
      respondersBySos[sId].push(r);
    });

    incidents.forEach((sos) => {
      const responders = respondersBySos[sos._id.toString()] || [];
      // Combine responders from collection or fallback to active volunteers in SOS doc
      if (responders.length > 0) {
        sos.responders = responders;
        sos.responderCount = responders.length;
      } else {
        const docVolunteers = (sos.volunteers || []).filter(
          (v) => v.status !== "STOOD_DOWN" && v.status !== "DECLINED"
        );
        sos.responders = docVolunteers;
        sos.responderCount = docVolunteers.length;
      }
    });

    return res.status(200).json({
      success: true,
      count: incidents.length,
      incidents
    });
  } catch (error) {
    console.error("[getActiveSOS] Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch active SOS incidents: " + error.message
    });
  }
};

/**
 * 3. GET SINGLE SOS INCIDENT DETAILS
 * GET /api/sos/:sosId
 */
export const getSOSById = async (req, res) => {
  try {
    const { sosId } = req.params;

    const sos = await SOS.findById(sosId)
      .populate("stationId", "name code location operationalStatus")
      .populate("expeditionId", "name expeditionNumber")
      .populate("personnelId")
      .populate("userId", "name role designation email phone")
      .populate("volunteers.userId", "name role designation phone")
      .populate("assignedResponder.userId", "name role designation phone")
      .populate("timeline.performedBy", "name role")
      .populate("resolution.resolvedBy", "name role")
      .lean();

    if (!sos) {
      return res.status(404).json({
        success: false,
        message: "SOS incident not found."
      });
    }

    // Fetch active responders from SOSResponder collection
    const responders = await SOSResponder.find({
      sosId,
      status: { $ne: "STOOD_DOWN" }
    })
      .populate("userId", "name role designation phone email")
      .sort({ createdAt: 1 })
      .lean();

    // Compute automatic intelligence stats
    let closestResponder = null;
    let closestTrainedResponder = null;

    responders.forEach((r) => {
      if (r.distanceKm != null) {
        if (!closestResponder || r.distanceKm < closestResponder.distanceKm) {
          closestResponder = r;
        }
        if (r.qualificationMatch === "HIGHLY_QUALIFIED" || r.qualificationMatch === "QUALIFIED") {
          if (!closestTrainedResponder || r.distanceKm < closestTrainedResponder.distanceKm) {
            closestTrainedResponder = r;
          }
        }
      }
    });

    const teamSummary = {
      assignedCount: responders.filter((r) => r.assigned).length,
      unassignedCount: responders.filter((r) => !r.assigned).length
    };

    sos.responders = responders;
    sos.responderCount = responders.length || (sos.volunteers?.filter((v) => v.status !== "STOOD_DOWN" && v.status !== "DECLINED").length || 0);
    sos.intelligence = {
      totalResponders: sos.responderCount,
      closestResponder,
      closestTrainedResponder,
      teamSummary
    };

    return res.status(200).json({
      success: true,
      sos
    });
  } catch (error) {
    console.error("[getSOSById] Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch SOS incident: " + error.message
    });
  }
};

/**
 * 4. ACKNOWLEDGE SOS
 * PATCH /api/sos/:sosId/acknowledge
 */
export const acknowledgeSOS = async (req, res) => {
  try {
    const { sosId } = req.params;
    const { notes } = req.body;
    const { userId, userDoc } = await resolveUserFromReq(req);

    const sos = await SOS.findById(sosId);

    if (!sos) {
      return res.status(404).json({ success: false, message: "SOS incident not found." });
    }

    if (sos.status === "RESOLVED" || sos.status === "CANCELLED") {
      return res.status(400).json({ success: false, message: `Cannot acknowledge an already ${sos.status} incident.` });
    }

    sos.status = "ACKNOWLEDGED";
    sos.acknowledgedAt = new Date();
    sos.acknowledgedBy = userId;

    sos.timeline.push({
      event: "SOS_ACKNOWLEDGED",
      status: "ACKNOWLEDGED",
      performedBy: userId,
      performedByName: userDoc?.name || "Station Command",
      performedByType: "COMMANDER",
      notes: notes || "SOS acknowledged by Station Command. Response planning in progress.",
      timestamp: new Date()
    });

    await sos.save();

    const updated = await SOS.findById(sosId)
      .populate("stationId", "name code location")
      .populate("userId", "name role")
      .lean();

    return res.status(200).json({
      success: true,
      message: "SOS acknowledged successfully.",
      sos: updated
    });
  } catch (error) {
    console.error("[acknowledgeSOS] Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 5. START ASSESSMENT
 * PATCH /api/sos/:sosId/assess
 */
export const assessSOS = async (req, res) => {
  try {
    const { sosId } = req.params;
    const { notes } = req.body;
    const { userId, userDoc } = await resolveUserFromReq(req);

    const sos = await SOS.findById(sosId);
    if (!sos) {
      return res.status(404).json({ success: false, message: "SOS incident not found." });
    }

    sos.status = "ASSESSING";
    sos.timeline.push({
      event: "ASSESSMENT_STARTED",
      status: "ASSESSING",
      performedBy: userId,
      performedByName: userDoc?.name || "Station Command",
      performedByType: "COMMANDER",
      notes: notes || "Rapid situation assessment underway. Available assets and responders being evaluated.",
      timestamp: new Date()
    });

    await sos.save();

    return res.status(200).json({
      success: true,
      message: "Incident moved to ASSESSING status.",
      sos
    });
  } catch (error) {
    console.error("[assessSOS] Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 6. "I'M RESPONDING" - PERSONNEL VOLUNTEER
 * POST /api/sos/:sosId/respond
 */
export const volunteerResponse = async (req, res) => {
  try {
    const { sosId } = req.params;
    const { latitude, longitude, accuracy, notes } = req.body;
    const { userId, userDoc } = await resolveUserFromReq(req);

    if (!userDoc || userDoc.isActive === false) {
      return res.status(403).json({ success: false, message: "Active user account required to respond." });
    }

    const sos = await SOS.findById(sosId);
    if (!sos) {
      return res.status(404).json({ success: false, message: "SOS incident not found." });
    }

    if (sos.status === "RESOLVED" || sos.status === "CANCELLED") {
      return res.status(400).json({ success: false, message: `Cannot volunteer for a ${sos.status} incident.` });
    }

    // Check if user is already responding (prevent duplicate response)
    const existingResponder = await SOSResponder.findOne({ sosId, userId });
    if (existingResponder && existingResponder.status !== "STOOD_DOWN") {
      return res.status(400).json({
        success: false,
        message: "You are already responding to this SOS."
      });
    }

    // Determine responder coordinates
    const latNum = parseFloat(latitude);
    const lngNum = parseFloat(longitude);
    const hasValidCoords = isValidCoordinates(lngNum, latNum);

    // Calculate distance to SOS location if both are valid
    let distanceKm = null;
    if (hasValidCoords && sos.location?.isAvailable && sos.location.coordinates?.length >= 2) {
      const [sosLng, sosLat] = sos.location.coordinates;
      distanceKm = calculateDistanceKm(lngNum, latNum, sosLng, sosLat);
    }

    // Determine qualification match
    const qualificationMatch = evaluateQualification(sos.emergencyType, userDoc.role, userDoc.designation);

    // Find associated personnel ID
    const personnelDoc = await Personnel.findOne({ userId }).lean();

    const locationPayload = {
      type: "Point",
      coordinates: hasValidCoords ? [lngNum, latNum] : [0, 0],
      latitude: hasValidCoords ? latNum : null,
      longitude: hasValidCoords ? lngNum : null,
      accuracy: typeof accuracy === "number" ? accuracy : null,
      isAvailable: hasValidCoords,
      capturedAt: new Date()
    };

    // Save or reactivate in SOSResponder collection
    let responderDoc = null;
    if (existingResponder) {
      existingResponder.status = "RESPONDING";
      existingResponder.location = locationPayload;
      existingResponder.distanceKm = distanceKm;
      existingResponder.notes = notes || "";
      existingResponder.volunteeredAt = new Date();
      existingResponder.lastLocationUpdate = new Date();
      existingResponder.statusUpdatedAt = new Date();
      await existingResponder.save();
      responderDoc = existingResponder;
    } else {
      responderDoc = await SOSResponder.create({
        sosId,
        personnelId: personnelDoc?._id || null,
        userId,
        name: userDoc.name,
        role: userDoc.role,
        designation: userDoc.designation || "",
        qualificationMatch,
        status: "RESPONDING",
        assigned: false,
        teamId: "UNASSIGNED",
        teamName: "Not Formally Assigned",
        location: locationPayload,
        distanceKm,
        notes: notes || "",
        volunteeredAt: new Date(),
        lastLocationUpdate: new Date(),
        statusUpdatedAt: new Date()
      });
    }

    // Also synchronize in sos.volunteers embedded array for backward compatibility
    const existingVolIdx = sos.volunteers.findIndex(
      (v) => v.userId && v.userId.toString() === userId.toString()
    );

    const volunteerPayload = {
      personnelId: personnelDoc?._id || null,
      userId,
      name: userDoc.name,
      role: userDoc.role,
      designation: userDoc.designation || "",
      qualificationMatch,
      location: locationPayload,
      distanceKm,
      volunteeredAt: new Date(),
      status: "RESPONDING",
      notes: notes || ""
    };

    if (existingVolIdx >= 0) {
      sos.volunteers[existingVolIdx] = volunteerPayload;
    } else {
      sos.volunteers.push(volunteerPayload);
    }

    // Record timeline entry
    const distText = distanceKm != null ? `${distanceKm} km away` : "location coordinates unavailable";
    sos.timeline.push({
      event: "RESPONDER_VOLUNTEERED",
      status: sos.status,
      performedBy: userId,
      performedByName: userDoc.name,
      performedByType: "RESPONDER",
      notes: `${userDoc.name} (${userDoc.role}) volunteered to respond [${distText}]. Status: RESPONDING. Suitability: ${qualificationMatch}.`,
      location: hasValidCoords ? { coordinates: [lngNum, latNum], accuracy } : undefined,
      timestamp: new Date()
    });

    await sos.save();

    // Query active responder count
    const responderCount = await SOSResponder.countDocuments({
      sosId,
      status: { $ne: "STOOD_DOWN" }
    });

    const populatedSOS = await SOS.findById(sosId)
      .populate("stationId", "name code location")
      .populate("volunteers.userId", "name role designation phone")
      .populate("assignedResponder.userId", "name role designation phone")
      .lean();

    if (populatedSOS) {
      populatedSOS.responderCount = responderCount;
    }

    return res.status(200).json({
      success: true,
      message: `✓ You are now responding to ${sos.sosNumber}`,
      isLocationAvailable: hasValidCoords,
      distanceKm,
      responder: responderDoc,
      sos: populatedSOS
    });
  } catch (error) {
    console.error("[volunteerResponse] Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 6b. "I'M NO LONGER RESPONDING" - STAND DOWN VOLUNTEER
 * PATCH /api/sos/:sosId/stand-down
 */
export const standDownResponse = async (req, res) => {
  try {
    const { sosId } = req.params;
    const { notes } = req.body;
    const { userId, userDoc } = await resolveUserFromReq(req);

    const sos = await SOS.findById(sosId);
    if (!sos) {
      return res.status(404).json({ success: false, message: "SOS incident not found." });
    }

    // Update in SOSResponder collection
    const responder = await SOSResponder.findOne({ sosId, userId });
    if (responder) {
      responder.status = "STOOD_DOWN";
      responder.statusUpdatedAt = new Date();
      await responder.save();
    }

    // Update in sos.volunteers embedded array
    const vol = sos.volunteers.find((v) => v.userId && v.userId.toString() === userId.toString());
    if (vol) {
      vol.status = "STOOD_DOWN";
    }

    sos.timeline.push({
      event: "RESPONDER_STOOD_DOWN",
      status: sos.status,
      performedBy: userId,
      performedByName: userDoc?.name || "Responder",
      performedByType: "RESPONDER",
      notes: `${userDoc?.name || "Responder"} stood down from voluntary response.${notes ? ` Note: ${notes}` : ""}`,
      timestamp: new Date()
    });

    await sos.save();

    const responderCount = await SOSResponder.countDocuments({
      sosId,
      status: { $ne: "STOOD_DOWN" }
    });

    const populatedSOS = await SOS.findById(sosId)
      .populate("stationId", "name code location")
      .populate("volunteers.userId", "name role designation phone")
      .populate("assignedResponder.userId", "name role designation phone")
      .lean();

    if (populatedSOS) {
      populatedSOS.responderCount = responderCount;
    }

    return res.status(200).json({
      success: true,
      message: "You are no longer marked as a responder.",
      sos: populatedSOS
    });
  } catch (error) {
    console.error("[standDownResponse] Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 6c. UPDATE VOLUNTEER RESPONSE STATUS
 * PATCH /api/sos/:sosId/responder-status
 * Progression: RESPONDING -> ON_THE_WAY -> ON_SITE -> ASSISTING -> STOOD_DOWN
 */
export const updateVolunteerStatus = async (req, res) => {
  try {
    const { sosId } = req.params;
    const { responderId, userId: targetUserId, status: newStatus, notes } = req.body;
    const { userId: currentUserId, userDoc } = await resolveUserFromReq(req);

    const validStatuses = ["RESPONDING", "ON_THE_WAY", "ON_SITE", "ASSISTING", "STOOD_DOWN"];
    if (!validStatuses.includes(newStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid responder status. Must be one of: ${validStatuses.join(", ")}`
      });
    }

    const sos = await SOS.findById(sosId);
    if (!sos) {
      return res.status(404).json({ success: false, message: "SOS incident not found." });
    }

    // Determine target responder
    const isCommanderOrOperator =
      userDoc?.role === "STATION_COMMANDER" ||
      userDoc?.role === "STATION_OPERATOR" ||
      userDoc?.role === "HQ_COMMAND" ||
      userDoc?.role === "HQ_ADMIN";

    let targetId = currentUserId;
    if (isCommanderOrOperator && (targetUserId || responderId)) {
      if (targetUserId) targetId = targetUserId;
    }

    // Find and update in SOSResponder collection
    let responder = null;
    if (responderId) {
      responder = await SOSResponder.findById(responderId);
    }
    if (!responder) {
      responder = await SOSResponder.findOne({ sosId, userId: targetId });
    }

    if (!responder) {
      return res.status(404).json({ success: false, message: "Responder record not found." });
    }

    const oldStatus = responder.status;
    responder.status = newStatus;
    responder.statusUpdatedAt = new Date();
    if (notes) responder.notes = notes;
    await responder.save();

    // Also sync in sos.volunteers embedded array
    const vol = sos.volunteers.find(
      (v) => v.userId && v.userId.toString() === responder.userId.toString()
    );
    if (vol) {
      vol.status = newStatus;
      if (notes) vol.notes = notes;
    }

    sos.timeline.push({
      event: `RESPONDER_STATUS_${newStatus}`,
      status: sos.status,
      performedBy: currentUserId,
      performedByName: userDoc?.name || "Authorized User",
      performedByType: isCommanderOrOperator ? "COMMANDER" : "RESPONDER",
      notes: `${responder.name}'s response status updated: ${oldStatus} ➔ ${newStatus}.${notes ? ` Note: ${notes}` : ""}`,
      timestamp: new Date()
    });

    await sos.save();

    const populatedSOS = await SOS.findById(sosId)
      .populate("volunteers.userId", "name role designation phone")
      .populate("assignedResponder.userId", "name role designation phone")
      .lean();

    return res.status(200).json({
      success: true,
      message: `Response status updated to ${newStatus.replace(/_/g, " ")}.`,
      responder,
      sos: populatedSOS
    });
  } catch (error) {
    console.error("[updateVolunteerStatus] Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 6d. ASSIGN VOLUNTEER TO FORMAL RESPONSE TEAM
 * PATCH /api/sos/:sosId/assign-team
 */
export const assignResponseTeam = async (req, res) => {
  try {
    const { sosId } = req.params;
    const { responderId, userId: targetUserId, teamName = "TEAM ALPHA", teamId = "TEAM_ALPHA", notes } = req.body;
    const { userId: commanderUserId, userDoc: commanderDoc } = await resolveUserFromReq(req);

    const isCommanderOrOperator =
      commanderDoc?.role === "STATION_COMMANDER" ||
      commanderDoc?.role === "STATION_OPERATOR" ||
      commanderDoc?.role === "HQ_COMMAND" ||
      commanderDoc?.role === "HQ_ADMIN";

    if (!isCommanderOrOperator) {
      return res.status(403).json({
        success: false,
        message: "Only Station Commander and Station Operator can formally assign response teams."
      });
    }

    const sos = await SOS.findById(sosId);
    if (!sos) {
      return res.status(404).json({ success: false, message: "SOS incident not found." });
    }

    // Find responder
    let responder = null;
    if (responderId) {
      responder = await SOSResponder.findById(responderId);
    }
    if (!responder && targetUserId) {
      responder = await SOSResponder.findOne({ sosId, userId: targetUserId });
    }

    if (!responder) {
      return res.status(404).json({ success: false, message: "Responder record not found." });
    }

    // Update responder formal assignment
    responder.assigned = true;
    responder.teamName = teamName;
    responder.teamId = teamId;
    responder.assignedBy = commanderUserId;
    responder.assignedAt = new Date();
    await responder.save();

    // Also update in sos.volunteers embedded array
    const vol = sos.volunteers.find(
      (v) => v.userId && v.userId.toString() === responder.userId.toString()
    );
    if (vol) {
      vol.assigned = true;
      vol.teamName = teamName;
    }

    sos.timeline.push({
      event: "RESPONSE_TEAM_ASSIGNED",
      status: sos.status,
      performedBy: commanderUserId,
      performedByName: commanderDoc?.name || "Station Command",
      performedByType: "COMMANDER",
      notes: `Commander formally assigned ${responder.name} to [${teamName}].${notes ? ` Note: ${notes}` : ""}`,
      timestamp: new Date()
    });

    await sos.save();

    return res.status(200).json({
      success: true,
      message: `${responder.name} formally assigned to ${teamName}.`,
      responder,
      sos
    });
  } catch (error) {
    console.error("[assignResponseTeam] Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 6e. GET ALL RESPONDERS FOR SOS WITH LIVE INTELLIGENCE
 * GET /api/sos/:sosId/responders
 */
export const getResponders = async (req, res) => {
  try {
    const { sosId } = req.params;

    const responders = await SOSResponder.find({
      sosId,
      status: { $ne: "STOOD_DOWN" }
    })
      .populate("userId", "name role designation email phone")
      .sort({ distanceKm: 1, createdAt: 1 })
      .lean();

    let closestResponder = null;
    let closestTrainedResponder = null;

    responders.forEach((r) => {
      if (r.distanceKm != null) {
        if (!closestResponder || r.distanceKm < closestResponder.distanceKm) {
          closestResponder = r;
        }
        if (r.qualificationMatch === "HIGHLY_QUALIFIED" || r.qualificationMatch === "QUALIFIED") {
          if (!closestTrainedResponder || r.distanceKm < closestTrainedResponder.distanceKm) {
            closestTrainedResponder = r;
          }
        }
      }
    });

    const stats = {
      totalResponders: responders.length,
      closestResponder,
      closestTrainedResponder,
      teamSummary: {
        assignedCount: responders.filter((r) => r.assigned).length,
        unassignedCount: responders.filter((r) => !r.assigned).length
      }
    };

    return res.status(200).json({
      success: true,
      count: responders.length,
      responders,
      stats
    });
  } catch (error) {
    console.error("[getResponders] Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 7. ACCEPT RESPONDER (COMMANDER ACTION)
 * PATCH /api/sos/:sosId/accept-responder
 */
export const acceptResponder = async (req, res) => {
  try {
    const { sosId } = req.params;
    const { volunteerId, userId: targetUserId, notes } = req.body;
    const { userId: commanderUserId, userDoc: commanderDoc } = await resolveUserFromReq(req);

    const sos = await SOS.findById(sosId);
    if (!sos) {
      return res.status(404).json({ success: false, message: "SOS incident not found." });
    }

    // Find the volunteer
    let volunteer = null;
    if (volunteerId) {
      volunteer = sos.volunteers.id(volunteerId);
    } else if (targetUserId) {
      volunteer = sos.volunteers.find((v) => v.userId && v.userId.toString() === targetUserId.toString());
    }

    if (!volunteer) {
      return res.status(404).json({ success: false, message: "Volunteer record not found in this incident." });
    }

    // Mark chosen volunteer as ACCEPTED, others remain or update
    sos.volunteers.forEach((v) => {
      if (v._id.toString() === volunteer._id.toString()) {
        v.status = "ACCEPTED";
      }
    });

    // Assign to assignedResponder
    sos.assignedResponder = {
      personnelId: volunteer.personnelId,
      userId: volunteer.userId,
      name: volunteer.name,
      role: volunteer.role,
      designation: volunteer.designation,
      assignedAt: new Date(),
      dispatchedAt: new Date(),
      responderLocation: volunteer.location,
      distanceKm: volunteer.distanceKm,
      trackingActive: true
    };

    sos.assignedTo = volunteer.userId;
    sos.status = "RESPONSE_ASSIGNED";

    sos.timeline.push({
      event: "RESPONDER_ACCEPTED",
      status: "RESPONSE_ASSIGNED",
      performedBy: commanderUserId,
      performedByName: commanderDoc?.name || "Station Commander",
      performedByType: "COMMANDER",
      notes: `Station Command accepted responder ${volunteer.name}. Response team assigned and live telemetry watch enabled.${notes ? ` Note: ${notes}` : ""}`,
      timestamp: new Date()
    });

    await sos.save();

    const populatedSOS = await SOS.findById(sosId)
      .populate("volunteers.userId", "name role designation phone")
      .populate("assignedResponder.userId", "name role designation phone")
      .lean();

    return res.status(200).json({
      success: true,
      message: `Responder ${volunteer.name} accepted and dispatched.`,
      sos: populatedSOS
    });
  } catch (error) {
    console.error("[acceptResponder] Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 8. DECLINE A VOLUNTEER
 * PATCH /api/sos/:sosId/decline-volunteer
 */
export const declineVolunteer = async (req, res) => {
  try {
    const { sosId } = req.params;
    const { volunteerId, reason } = req.body;
    const { userId: commanderUserId, userDoc: commanderDoc } = await resolveUserFromReq(req);

    const sos = await SOS.findById(sosId);
    if (!sos) {
      return res.status(404).json({ success: false, message: "SOS incident not found." });
    }

    const volunteer = sos.volunteers.id(volunteerId);
    if (!volunteer) {
      return res.status(404).json({ success: false, message: "Volunteer not found." });
    }

    volunteer.status = "DECLINED";

    sos.timeline.push({
      event: "VOLUNTEER_DECLINED",
      status: sos.status,
      performedBy: commanderUserId,
      performedByName: commanderDoc?.name || "Station Commander",
      performedByType: "COMMANDER",
      notes: `Response offer from ${volunteer.name} declined by Command.${reason ? ` Reason: ${reason}` : ""}`,
      timestamp: new Date()
    });

    await sos.save();

    return res.status(200).json({
      success: true,
      message: `Volunteer ${volunteer.name} declined.`,
      sos
    });
  } catch (error) {
    console.error("[declineVolunteer] Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 9. MANUALLY ASSIGN RESPONDER (COMMANDER OVERRIDE)
 * PATCH /api/sos/:sosId/assign
 */
export const assignResponder = async (req, res) => {
  try {
    const { sosId } = req.params;
    const { userId: targetUserId, personnelId: targetPersonnelId, notes } = req.body;
    const { userId: commanderUserId, userDoc: commanderDoc } = await resolveUserFromReq(req);

    const sos = await SOS.findById(sosId);
    if (!sos) {
      return res.status(404).json({ success: false, message: "SOS incident not found." });
    }

    let userDoc = null;
    if (targetUserId) {
      userDoc = await User.findById(targetUserId).lean();
    } else if (targetPersonnelId) {
      const p = await Personnel.findById(targetPersonnelId).populate("userId").lean();
      userDoc = p?.userId;
    }

    if (!userDoc) {
      return res.status(400).json({ success: false, message: "Target responder user or personnel not found." });
    }

    sos.assignedResponder = {
      personnelId: targetPersonnelId || null,
      userId: userDoc._id,
      name: userDoc.name,
      role: userDoc.role,
      designation: userDoc.designation || "",
      assignedAt: new Date(),
      dispatchedAt: new Date(),
      trackingActive: true
    };

    sos.assignedTo = userDoc._id;
    sos.status = "RESPONSE_ASSIGNED";

    sos.timeline.push({
      event: "RESPONDER_ASSIGNED_BY_COMMAND",
      status: "RESPONSE_ASSIGNED",
      performedBy: commanderUserId,
      performedByName: commanderDoc?.name || "Station Commander",
      performedByType: "COMMANDER",
      notes: `Station Command manually assigned ${userDoc.name} (${userDoc.role}) to lead the response.${notes ? ` Note: ${notes}` : ""}`,
      timestamp: new Date()
    });

    await sos.save();

    const populatedSOS = await SOS.findById(sosId)
      .populate("assignedResponder.userId", "name role designation phone")
      .lean();

    return res.status(200).json({
      success: true,
      message: `Assigned responder ${userDoc.name} to SOS incident.`,
      sos: populatedSOS
    });
  } catch (error) {
    console.error("[assignResponder] Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 10. UPDATE INCIDENT LIFECYCLE STATUS
 * PATCH /api/sos/:sosId/status
 */
export const updateSOSStatus = async (req, res) => {
  try {
    const { sosId } = req.params;
    const { status: targetStatus, notes } = req.body;
    const { userId, userDoc } = await resolveUserFromReq(req);

    const validStatuses = [
      "TRIGGERED",
      "ACKNOWLEDGED",
      "ASSESSING",
      "RESPONSE_ASSIGNED",
      "RESPONDER_DISPATCHED",
      "ON_SITE",
      "STABILIZED",
      "RESOLVED",
      "CANCELLED"
    ];

    if (!validStatuses.includes(targetStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`
      });
    }

    const sos = await SOS.findById(sosId);
    if (!sos) {
      return res.status(404).json({ success: false, message: "SOS incident not found." });
    }

    const previousStatus = sos.status;
    sos.status = targetStatus;

    if (targetStatus === "RESPONDER_DISPATCHED" && sos.assignedResponder) {
      sos.assignedResponder.dispatchedAt = new Date();
      sos.assignedResponder.trackingActive = true;
    }

    if (targetStatus === "ON_SITE") {
      if (sos.assignedResponder) {
        sos.assignedResponder.arrivedAt = new Date();
        sos.assignedResponder.trackingActive = false; // Stop tracking upon reaching incident
      }
    }

    if (targetStatus === "RESOLVED" || targetStatus === "CANCELLED") {
      if (sos.assignedResponder) {
        sos.assignedResponder.trackingActive = false;
      }
      sos.resolution = {
        resolvedAt: new Date(),
        resolvedBy: userId,
        resolvedByName: userDoc?.name,
        resolutionNotes: notes || `Incident marked ${targetStatus}.`,
        outcome: targetStatus
      };
    }

    sos.timeline.push({
      event: `STATUS_${targetStatus}`,
      status: targetStatus,
      performedBy: userId,
      performedByName: userDoc?.name || "Authorized Personnel",
      performedByType:
        userDoc?.role === "STATION_COMMANDER" || userDoc?.role === "HQ_COMMAND" ? "COMMANDER" : "RESPONDER",
      notes: notes || `Incident status changed from ${previousStatus} to ${targetStatus}.`,
      timestamp: new Date()
    });

    await sos.save();

    const populatedSOS = await SOS.findById(sosId)
      .populate("stationId", "name code")
      .populate("assignedResponder.userId", "name role phone")
      .populate("volunteers.userId", "name role")
      .lean();

    return res.status(200).json({
      success: true,
      message: `Status updated to ${targetStatus}.`,
      sos: populatedSOS
    });
  } catch (error) {
    console.error("[updateSOSStatus] Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 11. UPDATE LIVE RESPONDER LOCATION
 * PATCH /api/sos/:sosId/location
 */
export const updateResponderLocation = async (req, res) => {
  try {
    const { sosId } = req.params;
    const { latitude, longitude, accuracy } = req.body;
    const { userId } = await resolveUserFromReq(req);

    const latNum = parseFloat(latitude);
    const lngNum = parseFloat(longitude);

    if (!isValidCoordinates(lngNum, latNum)) {
      return res.status(400).json({
        success: false,
        message: "Invalid GPS coordinates: latitude (-90 to 90), longitude (-180 to 180)."
      });
    }

    const sos = await SOS.findById(sosId);
    if (!sos) {
      return res.status(404).json({ success: false, message: "SOS incident not found." });
    }

    if (sos.status === "RESOLVED" || sos.status === "CANCELLED") {
      return res.status(400).json({ success: false, message: "Cannot track location for a closed incident." });
    }

    // Recalculate distance to SOS
    let distanceKm = null;
    if (sos.location?.isAvailable && sos.location.coordinates?.length >= 2) {
      const [sosLng, sosLat] = sos.location.coordinates;
      distanceKm = calculateDistanceKm(lngNum, latNum, sosLng, sosLat);
    }

    // If user is the assigned responder
    if (
      sos.assignedResponder &&
      sos.assignedResponder.userId &&
      sos.assignedResponder.userId.toString() === userId.toString()
    ) {
      sos.assignedResponder.responderLocation = {
        type: "Point",
        coordinates: [lngNum, latNum],
        accuracy: typeof accuracy === "number" ? accuracy : null,
        capturedAt: new Date()
      };
      sos.assignedResponder.distanceKm = distanceKm;
      sos.assignedResponder.trackingActive = true;
    }

    // Also update in volunteers list if present
    const vol = sos.volunteers.find((v) => v.userId && v.userId.toString() === userId.toString());
    if (vol) {
      vol.location = {
        type: "Point",
        coordinates: [lngNum, latNum],
        accuracy: typeof accuracy === "number" ? accuracy : null,
        capturedAt: new Date()
      };
      vol.distanceKm = distanceKm;
    }

    await sos.save();

    // Also update in SOSResponder collection
    const respDoc = await SOSResponder.findOne({ sosId, userId });
    if (respDoc) {
      respDoc.location = {
        type: "Point",
        coordinates: [lngNum, latNum],
        latitude: latNum,
        longitude: lngNum,
        accuracy: typeof accuracy === "number" ? accuracy : null,
        isAvailable: true,
        capturedAt: new Date()
      };
      respDoc.distanceKm = distanceKm;
      respDoc.lastLocationUpdate = new Date();
      await respDoc.save();
    }

    return res.status(200).json({
      success: true,
      message: "Responder location telemetry updated.",
      distanceKm,
      coordinates: [lngNum, latNum]
    });
  } catch (error) {
    console.error("[updateResponderLocation] Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 12. RESOLVE SOS INCIDENT
 * PATCH /api/sos/:sosId/resolve
 */
export const resolveSOS = async (req, res) => {
  try {
    const { sosId } = req.params;
    const { resolutionNotes, outcome = "STABILIZED_AND_SAFE" } = req.body;
    const { userId, userDoc } = await resolveUserFromReq(req);

    if (!resolutionNotes || !resolutionNotes.trim()) {
      return res.status(400).json({
        success: false,
        message: "Resolution report and notes are required to formally close an emergency SOS."
      });
    }

    const sos = await SOS.findById(sosId);
    if (!sos) {
      return res.status(404).json({ success: false, message: "SOS incident not found." });
    }

    sos.status = "RESOLVED";
    if (sos.assignedResponder) {
      sos.assignedResponder.trackingActive = false;
    }

    sos.resolution = {
      resolvedAt: new Date(),
      resolvedBy: userId,
      resolvedByName: userDoc?.name || "Commander",
      resolutionNotes: resolutionNotes.trim(),
      outcome
    };

    sos.timeline.push({
      event: "INCIDENT_RESOLVED",
      status: "RESOLVED",
      performedBy: userId,
      performedByName: userDoc?.name || "Commander",
      performedByType: "COMMANDER",
      notes: `Incident closed and resolved. Outcome: ${outcome}. Notes: ${resolutionNotes.trim()}`,
      timestamp: new Date()
    });

    await sos.save();

    // Log closure in IncidentEvent
    try {
      await IncidentEvent.create({
        sosId: sos._id,
        eventType: "INCIDENT_CLOSED",
        performedBy: userId,
        description: `Incident ${sos.sosNumber} resolved: ${resolutionNotes.trim()}`
      });
    } catch (ieErr) {
      console.error("[resolveSOS] IncidentEvent error:", ieErr.message);
    }

    const populatedSOS = await SOS.findById(sosId)
      .populate("stationId", "name code")
      .populate("assignedResponder.userId", "name role")
      .populate("resolution.resolvedBy", "name role")
      .lean();

    return res.status(200).json({
      success: true,
      message: "SOS incident resolved and successfully archived.",
      sos: populatedSOS
    });
  } catch (error) {
    console.error("[resolveSOS] Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 13. GET NEARBY CANDIDATE RESPONDERS AT STATION
 * GET /api/sos/:sosId/nearby-candidates
 */
export const getNearbyCandidates = async (req, res) => {
  try {
    const { sosId } = req.params;
    const sos = await SOS.findById(sosId).lean();
    if (!sos) {
      return res.status(404).json({ success: false, message: "SOS incident not found." });
    }

    // Find active personnel associated with this station or expedition
    const filter = { isActive: true };
    if (sos.stationId) {
      filter.stationId = sos.stationId;
    }

    const stationUsers = await User.find(filter)
      .select("name role designation email phone stationId")
      .lean();

    // Exclude the person who triggered the SOS
    const candidates = stationUsers
      .filter((u) => u._id.toString() !== (sos.userId?.toString() || ""))
      .map((u) => {
        const qualification = evaluateQualification(sos.emergencyType, u.role, u.designation);
        const isVolunteered = sos.volunteers?.some(
          (v) => v.userId && v.userId.toString() === u._id.toString()
        );
        const isAssigned =
          sos.assignedResponder?.userId &&
          sos.assignedResponder.userId.toString() === u._id.toString();

        return {
          ...u,
          qualificationMatch: qualification,
          isVolunteered,
          isAssigned
        };
      });

    // Sort: Highly Qualified first
    const qualRank = { HIGHLY_QUALIFIED: 3, QUALIFIED: 2, GENERAL: 1 };
    candidates.sort((a, b) => (qualRank[b.qualificationMatch] || 0) - (qualRank[a.qualificationMatch] || 0));

    return res.status(200).json({
      success: true,
      candidates
    });
  } catch (error) {
    console.error("[getNearbyCandidates] Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
