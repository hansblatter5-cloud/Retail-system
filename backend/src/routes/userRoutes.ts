import { Router } from "express";
import { listUsers, decideUser, updateUserRole } from "../controllers/userController";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

router.use(requireAuth, requireRole("OWNER", "MANAGER"));

router.get("/", listUsers);
router.patch("/:id/decision", decideUser);
router.patch("/:id/role", updateUserRole);

export default router;
