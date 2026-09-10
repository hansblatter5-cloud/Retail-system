import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { z } from "zod";

const router = Router();

router.get("/", async (_req, res) => {
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
  res.json(categories);
});

router.post("/", requireAuth, requireRole("OWNER", "MANAGER"), async (req, res) => {
  const parsed = z.object({ name: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const existing = await prisma.category.findUnique({ where: { name: parsed.data.name } });
  if (existing) return res.status(409).json({ error: "Category already exists" });

  const category = await prisma.category.create({ data: parsed.data });
  res.status(201).json(category);
});

export default router;
