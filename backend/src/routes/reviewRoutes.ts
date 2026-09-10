import { Router } from "express";
import {
  listReviews,
  submitReview,
  listPendingReviews,
  moderateReview,
} from "../controllers/reviewController";
import { requireAuth, requireRole } from "../middleware/auth";
import { reviewSubmissionLimiter } from "../middleware/rateLimiters";

const router = Router();

// Public
router.get("/product/:productId", listReviews);
router.post("/", reviewSubmissionLimiter, submitReview);

// Staff moderation
router.get("/pending", requireAuth, requireRole("OWNER", "MANAGER"), listPendingReviews);
router.patch("/:id/moderate", requireAuth, requireRole("OWNER", "MANAGER"), moderateReview);

export default router;
