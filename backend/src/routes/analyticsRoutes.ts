import { Router } from "express";
import { dashboardSummary } from "../controllers/analyticsController";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

router.get("/dashboard", requireAuth, requireRole("OWNER", "MANAGER"), dashboardSummary);

export default router;
