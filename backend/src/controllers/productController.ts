import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { logAudit } from "../utils/audit";
import { queryString } from "../utils/queryString";

// Public — storefront product listing. Only active products with stock info.
export async function listProducts(req: Request, res: Response) {
  const category = queryString(req.query.category);
  const search = queryString(req.query.search);
  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      ...(category ? { categoryId: category } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { sku: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      category: true,
      images: { orderBy: { sortOrder: "asc" } },
      _count: { select: { reviews: { where: { status: "APPROVED" } } } },
    },
    orderBy: { createdAt: "desc" },
  });
  const withRatings = await attachRatingSummaries(products);
  return res.json(withRatings);
}

export async function getProduct(req: Request, res: Response) {
  const product = await prisma.product.findUnique({
    where: { id: String(req.params.id) },
    include: {
      category: true,
      images: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!product) return res.status(404).json({ error: "Product not found" });
  const [withRating] = await attachRatingSummaries([product]);
  return res.json(withRating);
}

// Attaches { avgRating, reviewCount } computed from APPROVED reviews only,
// so pending/rejected submissions never affect the public-facing rating.
async function attachRatingSummaries<T extends { id: string }>(products: T[]) {
  if (products.length === 0) return products;
  const grouped = await prisma.review.groupBy({
    by: ["productId"],
    where: { productId: { in: products.map((p) => p.id) }, status: "APPROVED" },
    _avg: { rating: true },
    _count: { rating: true },
  });
  const byProductId = new Map(grouped.map((g) => [g.productId, g]));
  return products.map((p) => {
    const stats = byProductId.get(p.id);
    return {
      ...p,
      avgRating: stats?._avg.rating ? Math.round(stats._avg.rating * 10) / 10 : null,
      reviewCount: stats?._count.rating ?? 0,
    };
  });
}

const productSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  sku: z.string().min(1).max(50),
  price: z.number().int().positive().max(100_000_000), // 100M KSh ceiling — sane upper bound, not a real limit on the business
  stock: z.number().int().min(0).max(1_000_000).default(0),
  lowStockThreshold: z.number().int().min(0).max(1_000_000).default(5),
  imageUrl: z.string().url().max(1000).optional(),
  categoryId: z.string().optional(),
  // Gallery images beyond the cover photo. Max 8 keeps payload/storage sane.
  images: z.array(z.string().url().max(1000)).max(8).optional(),
});

// Admin/Manager — create a product.
export async function createProduct(req: Request, res: Response) {
  const parsed = productSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const existingSku = await prisma.product.findUnique({ where: { sku: parsed.data.sku } });
  if (existingSku) return res.status(409).json({ error: "A product with this SKU already exists" });

  const { images, ...productData } = parsed.data;
  // Cover photo (imageUrl) always becomes gallery image 0 if provided, so the
  // gallery and the legacy single-image field never disagree.
  const galleryUrls = [productData.imageUrl, ...(images ?? [])].filter(
    (url, i, arr): url is string => !!url && arr.indexOf(url) === i
  );

  const product = await prisma.product.create({
    data: {
      ...productData,
      images: galleryUrls.length
        ? { create: galleryUrls.map((url, sortOrder) => ({ url, sortOrder })) }
        : undefined,
    },
    include: { images: { orderBy: { sortOrder: "asc" } } },
  });

  if (product.stock > 0) {
    await prisma.stockMovement.create({
      data: {
        productId: product.id,
        change: product.stock,
        reason: "RESTOCK",
        createdById: req.user!.userId,
      },
    });
  }

  return res.status(201).json(product);
}

const updateProductSchema = productSchema.partial();

export async function updateProduct(req: Request, res: Response) {
  const parsed = updateProductSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const existing = await prisma.product.findUnique({ where: { id: String(req.params.id) } });
  if (!existing) return res.status(404).json({ error: "Product not found" });

  const { images, ...productData } = parsed.data;

  const updated = await prisma.$transaction(async (tx) => {
    // Only touch the gallery if the caller actually sent an `images` array —
    // omitting it leaves the existing gallery untouched (e.g. a price-only edit).
    if (images) {
      await tx.productImage.deleteMany({ where: { productId: existing.id } });
      const cover = productData.imageUrl ?? existing.imageUrl;
      const galleryUrls = [cover, ...images].filter(
        (url, i, arr): url is string => !!url && arr.indexOf(url) === i
      );
      if (galleryUrls.length) {
        await tx.productImage.createMany({
          data: galleryUrls.map((url, sortOrder) => ({ productId: existing.id, url, sortOrder })),
        });
      }
    }
    return tx.product.update({
      where: { id: existing.id },
      data: productData,
      include: { images: { orderBy: { sortOrder: "asc" } } },
    });
  });

  return res.json(updated);
}

export async function deleteProduct(req: Request, res: Response) {
  const existing = await prisma.product.findUnique({ where: { id: String(req.params.id) } });
  if (!existing) return res.status(404).json({ error: "Product not found" });

  // Soft delete — keeps order history intact instead of breaking referential integrity.
  await prisma.product.update({ where: { id: String(req.params.id) }, data: { isActive: false } });

  await logAudit({
    action: "PRODUCT_DEACTIVATED",
    actorId: req.user!.userId,
    targetType: "Product",
    targetId: existing.id,
    metadata: { name: existing.name, sku: existing.sku },
  });

  return res.json({ message: "Product deactivated" });
}

const restockSchema = z.object({
  quantity: z.number().int(),
  reason: z.enum(["RESTOCK", "ADJUSTMENT", "RETURN"]).default("RESTOCK"),
});

// Manual stock adjustment (restock, correction, return-to-stock).
export async function adjustStock(req: Request, res: Response) {
  const parsed = restockSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const product = await prisma.product.findUnique({ where: { id: String(req.params.id) } });
  if (!product) return res.status(404).json({ error: "Product not found" });

  const newStock = product.stock + parsed.data.quantity;
  if (newStock < 0) return res.status(400).json({ error: "Stock cannot go below zero" });

  const [updated] = await prisma.$transaction([
    prisma.product.update({ where: { id: product.id }, data: { stock: newStock } }),
    prisma.stockMovement.create({
      data: {
        productId: product.id,
        change: parsed.data.quantity,
        reason: parsed.data.reason,
        createdById: req.user!.userId,
      },
    }),
  ]);

  return res.json(updated);
}

// Low-stock alert list for the dashboard.
export async function lowStockProducts(_req: Request, res: Response) {
  const products = await prisma.product.findMany({
    where: { isActive: true },
  });
  const lowStock = products.filter((p) => p.stock <= p.lowStockThreshold);
  return res.json(lowStock);
}
