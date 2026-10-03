import express from "express";
import requireAuth from "../middleware/authMiddleware.js";
import {
  createSOS,
  getActiveSOS,
  getSOSById,
  acknowledgeSOS,
  assessSOS,
  volunteerResponse,
  standDownResponse,
  updateVolunteerStatus,
  assignResponseTeam,
  getResponders,
  acceptResponder,
  declineVolunteer,
  assignResponder,
  updateSOSStatus,
  updateResponderLocation,
  resolveSOS,
  getNearbyCandidates
} from "../controllers/sosController.js";

const router = express.Router();

// All SOS endpoints require valid user authentication
router.use(requireAuth);

// 1. SOS Incident Initiation & Listing
router.post("/", createSOS);
router.get("/active", getActiveSOS);
router.get("/:sosId", getSOSById);

// 2. Incident Status & Command Lifecycle Controls
router.patch("/:sosId/acknowledge", acknowledgeSOS);
router.patch("/:sosId/assess", assessSOS);
router.patch("/:sosId/status", updateSOSStatus);
router.patch("/:sosId/resolve", resolveSOS);

// 3. Responder Voluntary Response & Team Coordination
router.post("/:sosId/respond", volunteerResponse);
router.patch("/:sosId/stand-down", standDownResponse);
router.patch("/:sosId/responder-status", updateVolunteerStatus);
router.patch("/:sosId/assign-team", assignResponseTeam);
router.get("/:sosId/responders", getResponders);

// 4. Command Assignment & Overrides
router.patch("/:sosId/accept-responder", acceptResponder);
router.patch("/:sosId/decline-volunteer", declineVolunteer);
router.patch("/:sosId/assign", assignResponder);

// 5. Live Telemetry & Personnel Queries
router.patch("/:sosId/location", updateResponderLocation);
router.get("/:sosId/nearby-candidates", getNearbyCandidates);

export default router;
