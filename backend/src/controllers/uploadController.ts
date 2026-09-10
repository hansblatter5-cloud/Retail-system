import { Request, Response } from "express";
import { uploadImageBuffer, isCloudinaryConfigured } from "../lib/cloudinary";

function notConfiguredResponse(res: Response) {
  return res.status(503).json({
    error:
      "Image upload isn't configured yet. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET, or paste an image URL instead.",
  });
}

// Single cover image — kept for backward compatibility with existing frontend calls.
export async function uploadProductImage(req: Request, res: Response) {
  if (!isCloudinaryConfigured()) return notConfiguredResponse(res);
  if (!req.file) return res.status(400).json({ error: "No image file was provided" });

  try {
    const url = await uploadImageBuffer(req.file.buffer, "daniel-retail/products");
    return res.status(201).json({ url });
  } catch (err) {
    console.error("Image upload failed:", err);
    return res.status(502).json({ error: "Image upload failed. Please try again." });
  }
}

// Multiple gallery images in one request — staff-only, used by the product form.
export async function uploadProductImages(req: Request, res: Response) {
  if (!isCloudinaryConfigured()) return notConfiguredResponse(res);
  const files = (req.files as Express.Multer.File[]) || [];
  if (files.length === 0) return res.status(400).json({ error: "No image files were provided" });

  try {
    const urls = await Promise.all(
      files.map((file) => uploadImageBuffer(file.buffer, "daniel-retail/products"))
    );
    return res.status(201).json({ urls });
  } catch (err) {
    console.error("Image upload failed:", err);
    return res.status(502).json({ error: "One or more images failed to upload. Please try again." });
  }
}

// Public — lets a customer attach photos/videos to a review or Q&A submission.
// Rate-limited at the route level; files land in a separate folder from
// staff-managed product photos so the two are easy to moderate independently.
export async function uploadReviewAttachment(req: Request, res: Response) {
  if (!isCloudinaryConfigured()) return notConfiguredResponse(res);
  if (!req.file) return res.status(400).json({ error: "No file was provided" });

  const isVideo = req.file.mimetype.startsWith("video/");
  try {
    const url = await uploadImageBuffer(
      req.file.buffer,
      "daniel-retail/review-attachments",
      isVideo ? "video" : "image"
    );
    return res.status(201).json({ url, type: isVideo ? "video" : "image" });
  } catch (err) {
    console.error("Review attachment upload failed:", err);
    return res.status(502).json({ error: "Upload failed. Please try again." });
  }
}
