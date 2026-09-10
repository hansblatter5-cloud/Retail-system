import { Router } from "express";
import {
  signup,
  login,
  me,
  forgotPassword,
  resetPassword,
  changePassword,
} from "../controllers/authController";
import { requireAuth } from "../middleware/auth";
import { forgotPasswordLimiter } from "../middleware/rateLimiters";

const router = Router();

router.post("/signup", signup);
router.post("/login", login);
router.get("/me", requireAuth, me);

router.post("/forgot-password", forgotPasswordLimiter, forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/change-password", requireAuth, changePassword);

export default router;
