import { Router } from "express";
import {
  createOrder,
  listOrders,
  getOrder,
  updateOrderStatus,
} from "../controllers/orderController";
import { requireAuth, requireRole } from "../middleware/auth";
import { orderCreationLimiter } from "../middleware/rateLimiters";

const router = Router();

// Public storefront checkout does NOT require auth (channel defaults to ONLINE).
// In-store POS sales (channel: IN_STORE) are checked for req.user inside the controller,
// but we still attach the user if a token is present so createdBy is recorded correctly.
//
// The rate limiter only applies to unauthenticated (public storefront) requests —
// staff logging POS sales throughout a busy day should never be throttled by it.
router.post(
  "/",
  (req, res, next) => {
    const header = req.headers.authorization;
    if (header && header.startsWith("Bearer ")) return next();
    return orderCreationLimiter(req, res, next);
  },
  async (req, res) => {
    const header = req.headers.authorization;
    if (header && header.startsWith("Bearer ")) {
      return requireAuth(req, res, () => createOrder(req, res));
    }
    return createOrder(req, res);
  }
);

router.get("/", requireAuth, requireRole("OWNER", "MANAGER", "STAFF"), listOrders);
router.get("/:id", requireAuth, requireRole("OWNER", "MANAGER", "STAFF"), getOrder);
router.patch("/:id/status", requireAuth, requireRole("OWNER", "MANAGER", "STAFF"), updateOrderStatus);

export default router;
