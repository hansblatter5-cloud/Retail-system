import { Router } from "express";
import { getStoreSettings, updateStoreSettings } from "../controllers/settingsController";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

router.get("/", getStoreSettings);
router.put("/", requireAuth, requireRole("OWNER"), updateStoreSettings);

export default router;
