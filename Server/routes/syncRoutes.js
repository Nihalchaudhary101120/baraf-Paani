import express from "express";
import { syncOfflineEvents } from "../controllers/sync/syncController.js";
import requireAuth from "../middleware/authMiddleware.js";
import requireRole from "../middleware/roleMiddleware.js";

const router = express.Router();

// Sync offline events from PouchDB queue
router.post("/", requireAuth, syncOfflineEvents);

export default router;