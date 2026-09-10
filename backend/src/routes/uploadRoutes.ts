import { Router } from "express";
import multer from "multer";
import {
  uploadProductImage,
  uploadProductImages,
  uploadReviewAttachment,
} from "../controllers/uploadController";
import { requireAuth, requireRole } from "../middleware/auth";
import { publicUploadLimiter } from "../middleware/rateLimiters";

const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const REVIEW_MIME_TYPES = new Set([...IMAGE_MIME_TYPES, "video/mp4", "video/webm", "video/quicktime"]);

// Memory storage — files are streamed straight to Cloudinary and never touch
// disk, so there's nothing left behind to clean up or leak.
const productImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB — enough for a product photo, not enough to be a DoS vector
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    if (!IMAGE_MIME_TYPES.has(file.mimetype)) {
      return cb(new Error("Only JPEG, PNG, WEBP, or GIF images are allowed"));
    }
    cb(null, true);
  },
});

const productGalleryUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 8, // matches the max gallery size enforced in productController
  },
  fileFilter: (_req, file, cb) => {
    if (!IMAGE_MIME_TYPES.has(file.mimetype)) {
      return cb(new Error("Only JPEG, PNG, WEBP, or GIF images are allowed"));
    }
    cb(null, true);
  },
});

// Larger limit than product photos — needs to fit a short review video clip.
const reviewAttachmentUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    if (!REVIEW_MIME_TYPES.has(file.mimetype)) {
      return cb(new Error("Only JPEG, PNG, WEBP, GIF images or MP4/WEBM/MOV videos are allowed"));
    }
    cb(null, true);
  },
});

const router = Router();

router.post(
  "/product-image",
  requireAuth,
  requireRole("OWNER", "MANAGER"),
  (req, res, next) => {
    productImageUpload.single("image")(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message || "Invalid file upload" });
      next();
    });
  },
  uploadProductImage
);

router.post(
  "/product-images",
  requireAuth,
  requireRole("OWNER", "MANAGER"),
  (req, res, next) => {
    productGalleryUpload.array("images", 8)(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message || "Invalid file upload" });
      next();
    });
  },
  uploadProductImages
);

// Public — no requireAuth, since customers submitting reviews aren't logged in.
router.post(
  "/review-attachment",
  publicUploadLimiter,
  (req, res, next) => {
    reviewAttachmentUpload.single("file")(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message || "Invalid file upload" });
      next();
    });
  },
  uploadReviewAttachment
);

export default router;
