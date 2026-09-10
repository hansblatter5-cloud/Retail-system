import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { queryString } from "../utils/queryString";

export async function listCustomers(req: Request, res: Response) {
  const search = queryString(req.query.search);
  const customers = await prisma.customer.findMany({
    where: search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { phone: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
  });
  return res.json(customers);
}

export async function getCustomer(req: Request, res: Response) {
  const customer = await prisma.customer.findUnique({
    where: { id: String(req.params.id) },
    include: {
      orders: {
        include: { items: { include: { product: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!customer) return res.status(404).json({ error: "Customer not found" });
  return res.json(customer);
}

const customerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
});

export async function createCustomer(req: Request, res: Response) {
  const parsed = customerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const customer = await prisma.customer.create({ data: parsed.data });
  return res.status(201).json(customer);
}

export async function updateCustomer(req: Request, res: Response) {
  const parsed = customerSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const existing = await prisma.customer.findUnique({ where: { id: String(req.params.id) } });
  if (!existing) return res.status(404).json({ error: "Customer not found" });

  const updated = await prisma.customer.update({ where: { id: String(req.params.id) }, data: parsed.data });
  return res.json(updated);
}
