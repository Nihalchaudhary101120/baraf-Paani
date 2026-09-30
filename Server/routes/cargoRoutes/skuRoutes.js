import express from "express";
import {
  getSKUs,
  getSKUById,
  createSKU,
  updateSKU,
  getSKUInventorySummary,
} from "../../controllers/cargo/skuController.js";
import requireAuth from "../../middleware/authMiddleware.js";
import requireRole from "../../middleware/roleMiddleware.js";

const router = express.Router();

router.get("/", requireAuth, getSKUs);
router.get("/summary/inventory", requireAuth, getSKUInventorySummary);
router.get("/:id", requireAuth, getSKUById);

// Creation allowed for CARGO_OFFICER, LOGISTICS_OFFICER, HQ_ADMIN, HQ_COMMAND
router.post(
  "/",
  requireAuth,
  requireRole("CARGO_OFFICER", "LOGISTICS_OFFICER", "HQ_ADMIN", "HQ_COMMAND", "INVENTORY_MANAGER"),
  createSKU
);

router.patch(
  "/:id",
  requireAuth,
  requireRole("CARGO_OFFICER", "LOGISTICS_OFFICER", "HQ_ADMIN", "HQ_COMMAND", "INVENTORY_MANAGER"),
  updateSKU
);

export default router;
