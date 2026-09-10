import { Router } from "express";
import {
  listShippingZones,
  calculateShipping,
  listAllShippingZones,
  createShippingZone,
  updateShippingZone,
  deleteShippingZone,
} from "../controllers/shippingController";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

// Public
router.get("/", listShippingZones);
router.get("/calculate", calculateShipping);

// Staff admin
router.get("/all", requireAuth, requireRole("OWNER", "MANAGER"), listAllShippingZones);
router.post("/", requireAuth, requireRole("OWNER", "MANAGER"), createShippingZone);
router.put("/:id", requireAuth, requireRole("OWNER", "MANAGER"), updateShippingZone);
router.delete("/:id", requireAuth, requireRole("OWNER", "MANAGER"), deleteShippingZone);

export default router;
