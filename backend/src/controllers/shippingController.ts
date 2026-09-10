import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";

// Public — feeds the shipping calculator / delivery estimate on product &
// checkout pages. Only active zones, cheapest first.
export async function listShippingZones(_req: Request, res: Response) {
  const zones = await prisma.shippingZone.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  return res.json(zones);
}

// Public — given a zone + order subtotal, returns the actual shipping cost
// (accounting for the zone's free-shipping threshold) and delivery window.
export async function calculateShipping(req: Request, res: Response) {
  const zoneId = String(req.query.zoneId || "");
  const subtotal = Number(req.query.subtotal || 0);

  const zone = await prisma.shippingZone.findUnique({ where: { id: zoneId } });
  if (!zone || !zone.isActive) return res.status(404).json({ error: "Shipping zone not found" });

  const freeShipping = zone.freeOverAmount != null && subtotal >= zone.freeOverAmount;
  return res.json({
    zone: zone.name,
    shippingCost: freeShipping ? 0 : zone.rate,
    freeShippingApplied: freeShipping,
    estDeliveryDaysMin: zone.estDeliveryDaysMin,
    estDeliveryDaysMax: zone.estDeliveryDaysMax,
  });
}

const zoneSchema = z.object({
  name: z.string().min(1).max(100),
  rate: z.number().int().min(0).max(1_000_000),
  freeOverAmount: z.number().int().min(0).max(10_000_000).optional(),
  estDeliveryDaysMin: z.number().int().min(0).max(60),
  estDeliveryDaysMax: z.number().int().min(0).max(60),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

// OWNER/MANAGER — admin CRUD for delivery zones + rates.
export async function listAllShippingZones(_req: Request, res: Response) {
  const zones = await prisma.shippingZone.findMany({ orderBy: { sortOrder: "asc" } });
  return res.json(zones);
}

export async function createShippingZone(req: Request, res: Response) {
  const parsed = zoneSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const zone = await prisma.shippingZone.create({ data: parsed.data });
  return res.status(201).json(zone);
}

export async function updateShippingZone(req: Request, res: Response) {
  const parsed = zoneSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const existing = await prisma.shippingZone.findUnique({ where: { id: String(req.params.id) } });
  if (!existing) return res.status(404).json({ error: "Shipping zone not found" });

  const updated = await prisma.shippingZone.update({ where: { id: existing.id }, data: parsed.data });
  return res.json(updated);
}

export async function deleteShippingZone(req: Request, res: Response) {
  const existing = await prisma.shippingZone.findUnique({ where: { id: String(req.params.id) } });
  if (!existing) return res.status(404).json({ error: "Shipping zone not found" });
  await prisma.shippingZone.update({ where: { id: existing.id }, data: { isActive: false } });
  return res.json({ message: "Shipping zone deactivated" });
}
