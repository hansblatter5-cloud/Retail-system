import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";

// Public — only answered questions are shown on the storefront.
export async function listAnsweredQuestions(req: Request, res: Response) {
  const productId = String(req.params.productId);
  const questions = await prisma.productQuestion.findMany({
    where: { productId, answer: { not: null } },
    orderBy: { answeredAt: "desc" },
    select: { id: true, authorName: true, question: true, answer: true, answeredAt: true, createdAt: true },
  });
  return res.json(questions);
}

const askSchema = z.object({
  productId: z.string(),
  authorName: z.string().min(1).max(200),
  authorEmail: z.string().email().max(255),
  question: z.string().min(1).max(1000),
});

// Public — question goes in unanswered until a staff member responds.
export async function askQuestion(req: Request, res: Response) {
  const parsed = askSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const product = await prisma.product.findUnique({ where: { id: parsed.data.productId } });
  if (!product) return res.status(404).json({ error: "Product not found" });

  const customer = await prisma.customer.findUnique({ where: { email: parsed.data.authorEmail } });

  const question = await prisma.productQuestion.create({
    data: { ...parsed.data, customerId: customer?.id },
  });

  return res.status(201).json({
    message: "Your question has been submitted. We'll answer it soon.",
    question: { id: question.id },
  });
}

// Staff — unanswered queue across all products.
export async function listUnansweredQuestions(_req: Request, res: Response) {
  const questions = await prisma.productQuestion.findMany({
    where: { answer: null },
    include: { product: { select: { id: true, name: true, sku: true } } },
    orderBy: { createdAt: "asc" },
  });
  return res.json(questions);
}

const answerSchema = z.object({ answer: z.string().min(1).max(2000) });

export async function answerQuestion(req: Request, res: Response) {
  const parsed = answerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const existing = await prisma.productQuestion.findUnique({ where: { id: String(req.params.id) } });
  if (!existing) return res.status(404).json({ error: "Question not found" });

  const updated = await prisma.productQuestion.update({
    where: { id: existing.id },
    data: { answer: parsed.data.answer, answeredById: req.user!.userId, answeredAt: new Date() },
  });
  return res.json(updated);
}
