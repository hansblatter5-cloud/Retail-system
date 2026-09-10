import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";

const SETTINGS_ID = "store";

// Public — drives the storefront info sidebar (contact, social, location)
// and the return-policy text shown on product pages.
export async function getStoreSettings(_req: Request, res: Response) {
  const settings = await prisma.storeSettings.findUnique({ where: { id: SETTINGS_ID } });
  if (!settings) return res.status(404).json({ error: "Store settings have not been configured yet" });
  return res.json(settings);
}

const settingsSchema = z.object({
  ownerName: z.string().min(1).max(200),
  contactEmail: z.string().email().max(255),
  whatsappNumber: z.string().min(1).max(30),
  socialHandle: z.string().min(1).max(100),
  facebookUrl: z.string().url().max(500).optional().or(z.literal("")),
  instagramUrl: z.string().url().max(500).optional().or(z.literal("")),
  xUrl: z.string().url().max(500).optional().or(z.literal("")),
  tiktokUrl: z.string().url().max(500).optional().or(z.literal("")),
  whatsappUrl: z.string().url().max(500).optional().or(z.literal("")),
  locationName: z.string().min(1).max(300),
  returnPolicy: z.string().min(1).max(5000),
});

// OWNER-only — full replace, upserts so it also works before the first seed.
export async function updateStoreSettings(req: Request, res: Response) {
  const parsed = settingsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const settings = await prisma.storeSettings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, ...parsed.data },
    update: parsed.data,
  });
  return res.json(settings);
}
