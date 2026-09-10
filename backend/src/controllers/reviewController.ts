import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { queryString } from "../utils/queryString";

// Public — approved reviews for a product, newest first, paginated.
export async function listReviews(req: Request, res: Response) {
  const productId = String(req.params.productId);
  const page = Math.max(1, Number(queryString(req.query.page)) || 1);
  const pageSize = 10;

  const [reviews, total, agg] = await Promise.all([
    prisma.review.findMany({
      where: { productId, status: "APPROVED" },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        authorName: true,
        rating: true,
        title: true,
        comment: true,
        photoUrls: true,
        videoUrls: true,
        verifiedPurchase: true,
        createdAt: true,
      },
    }),
    prisma.review.count({ where: { productId, status: "APPROVED" } }),
    prisma.review.aggregate({
      where: { productId, status: "APPROVED" },
      _avg: { rating: true },
      _count: { rating: true },
    }),
  ]);

  return res.json({
    reviews,
    page,
    pageSize,
    total,
    avgRating: agg._avg.rating ? Math.round(agg._avg.rating * 10) / 10 : null,
  });
}

const submitReviewSchema = z.object({
  productId: z.string(),
  authorName: z.string().min(1).max(200),
  authorEmail: z.string().email().max(255),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(200).optional(),
  comment: z.string().min(1).max(3000),
  photoUrls: z.array(z.string().url().max(1000)).max(6).default([]),
  videoUrls: z.array(z.string().url().max(1000)).max(2).default([]),
});

// Public — anyone can submit; goes to PENDING until staff approve it.
// verifiedPurchase is computed server-side, never trusted from the client.
export async function submitReview(req: Request, res: Response) {
  const parsed = submitReviewSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { productId, authorEmail, ...data } = parsed.data;

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return res.status(404).json({ error: "Product not found" });

  const customer = await prisma.customer.findUnique({ where: { email: authorEmail } });

  let verifiedPurchase = false;
  if (customer) {
    const purchase = await prisma.orderItem.findFirst({
      where: { productId, order: { customerId: customer.id } },
    });
    verifiedPurchase = Boolean(purchase);
  }

  const review = await prisma.review.create({
    data: {
      productId,
      authorEmail,
      customerId: customer?.id,
      verifiedPurchase,
      ...data,
    },
  });

  return res.status(201).json({
    message: "Thanks! Your review has been submitted and will appear once it's reviewed by our team.",
    review: { id: review.id, status: review.status },
  });
}

// Staff — pending queue across all products, for the moderation screen.
export async function listPendingReviews(_req: Request, res: Response) {
  const reviews = await prisma.review.findMany({
    where: { status: "PENDING" },
    include: { product: { select: { id: true, name: true, sku: true } } },
    orderBy: { createdAt: "asc" },
  });
  return res.json(reviews);
}

const moderateSchema = z.object({ status: z.enum(["APPROVED", "REJECTED"]) });

export async function moderateReview(req: Request, res: Response) {
  const parsed = moderateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const existing = await prisma.review.findUnique({ where: { id: String(req.params.id) } });
  if (!existing) return res.status(404).json({ error: "Review not found" });

  const updated = await prisma.review.update({
    where: { id: existing.id },
    data: { status: parsed.data.status, moderatedById: req.user!.userId },
  });
  return res.json(updated);
}
