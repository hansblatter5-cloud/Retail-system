import { Router } from "express";
import {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  adjustStock,
  lowStockProducts,
} from "../controllers/productController";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

// Public — storefront browsing.
router.get("/", listProducts);
router.get("/low-stock", requireAuth, requireRole("OWNER", "MANAGER"), lowStockProducts);
router.get("/:id", getProduct);

// Staff-only management.
router.post("/", requireAuth, requireRole("OWNER", "MANAGER"), createProduct);
router.put("/:id", requireAuth, requireRole("OWNER", "MANAGER"), updateProduct);
router.delete("/:id", requireAuth, requireRole("OWNER", "MANAGER"), deleteProduct);
router.post("/:id/stock", requireAuth, requireRole("OWNER", "MANAGER"), adjustStock);

export default router;
