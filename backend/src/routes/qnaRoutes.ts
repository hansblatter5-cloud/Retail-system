import { Router } from "express";
import {
  listAnsweredQuestions,
  askQuestion,
  listUnansweredQuestions,
  answerQuestion,
} from "../controllers/qnaController";
import { requireAuth, requireRole } from "../middleware/auth";
import { reviewSubmissionLimiter } from "../middleware/rateLimiters";

const router = Router();

// Public
router.get("/product/:productId", listAnsweredQuestions);
router.post("/", reviewSubmissionLimiter, askQuestion);

// Staff
router.get("/unanswered", requireAuth, requireRole("OWNER", "MANAGER", "STAFF"), listUnansweredQuestions);
router.patch("/:id/answer", requireAuth, requireRole("OWNER", "MANAGER", "STAFF"), answerQuestion);

export default router;
