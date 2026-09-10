import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { generateOrderNumber } from "../utils/auth";
import { logAudit } from "../utils/audit";
import { queryString } from "../utils/queryString";
import { Prisma, OrderStatus, OrderChannel } from "@prisma/client";
import {
  sendOrderConfirmationEmail,
  sendNewOrderAlertEmail,
  sendOrderStatusUpdateEmail,
} from "../utils/orderEmails";

const orderItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().positive().max(10_000),
});

const createOrderSchema = z.object({
  channel: z.enum(["ONLINE", "IN_STORE"]).default("ONLINE"),
  items: z.array(orderItemSchema).min(1).max(200),
  customer: z
    .object({
      id: z.string().optional(),
      name: z.string().max(200).optional(),
      email: z.string().email().max(255).optional(),
      phone: z.string().max(30).optional(),
      address: z.string().max(500).optional(),
    })
    .optional(),
  notes: z.string().max(1000).optional(),
});

// Creates an order — used by BOTH the public storefront checkout (channel: ONLINE)
// and the staff POS screen (channel: IN_STORE). Stock is deducted atomically in
// the same transaction regardless of channel, which is what keeps inventory unified.
export async function createOrder(req: Request, res: Response) {
  const parsed = createOrderSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { channel, items, customer, notes } = parsed.data;

  // IN_STORE sales must be logged by an authenticated staff member.
  if (channel === "IN_STORE" && !req.user) {
    return res.status(401).json({ error: "In-store sales must be recorded by a logged-in staff member" });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Resolve or create the customer record.
      let customerId: string | undefined = customer?.id;
      if (!customerId && customer?.name) {
        const created = await tx.customer.create({
          data: {
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            address: customer.address,
          },
        });
        customerId = created.id;
      }

      // Lock in product prices and validate stock availability.
      let totalAmount = 0;
      const resolvedItems: { productId: string; quantity: number; unitPrice: number; subtotal: number }[] = [];

      for (const item of items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product || !product.isActive) {
          throw new Error(`Product ${item.productId} not found or unavailable`);
        }
        if (product.stock < item.quantity) {
          throw new Error(`Insufficient stock for "${product.name}" — only ${product.stock} left`);
        }
        const subtotal = product.price * item.quantity;
        totalAmount += subtotal;
        resolvedItems.push({
          productId: product.id,
          quantity: item.quantity,
          unitPrice: product.price,
          subtotal,
        });
      }

      const order = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          channel,
          status: channel === "IN_STORE" ? "DELIVERED" : "PENDING",
          totalAmount,
          notes,
          customerId,
          createdById: req.user?.userId,
          items: { create: resolvedItems },
        },
        include: { items: { include: { product: true } }, customer: true },
      });

      // Deduct stock and log the movement for every item, keeping online and
      // in-store sales in the same ledger.
      for (const item of resolvedItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            change: -item.quantity,
            reason: "SALE",
            orderId: order.id,
            createdById: req.user?.userId,
          },
        });
      }

      return order;
    });

    notifyOrderCreated(result);
    return res.status(201).json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || "Failed to create order" });
  }
}

// Sends order notification emails without making the customer wait for them.
// Deliberately not awaited by the caller — a slow or failing email provider
// should never delay or break order creation, which is the part that
// actually matters (stock was already deducted in the transaction above).
function notifyOrderCreated(order: {
  id: string;
  orderNumber: string;
  totalAmount: number;
  channel: string;
  customer: { name: string; email: string | null } | null;
  items: { quantity: number; unitPrice: number; product: { name: string } }[];
}) {
  const emailData = {
    orderNumber: order.orderNumber,
    totalAmount: order.totalAmount,
    channel: order.channel as "ONLINE" | "IN_STORE",
    customerName: order.customer?.name,
    items: order.items.map((i) => ({
      productName: i.product.name,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      subtotal: i.unitPrice * i.quantity,
    })),
  };

  (async () => {
    try {
      if (order.customer?.email) {
        await sendOrderConfirmationEmail(order.customer.email, emailData);
      }

      const recipients = await prisma.user.findMany({
        where: { role: { in: ["OWNER", "MANAGER"] }, status: "APPROVED" },
        select: { email: true },
      });
      await sendNewOrderAlertEmail(recipients.map((r) => r.email), emailData);
    } catch (err) {
      console.error("Failed to send order notification emails:", err);
    }
  })();
}

export async function listOrders(req: Request, res: Response) {
  const status = queryString(req.query.status);
  const channel = queryString(req.query.channel);
  const search = queryString(req.query.search);
  const orders = await prisma.order.findMany({
    where: {
      ...(status ? { status: status as OrderStatus } : {}),
      ...(channel ? { channel: channel as OrderChannel } : {}),
      ...(search
        ? {
            OR: [
              { orderNumber: { contains: search, mode: "insensitive" } },
              { customer: { name: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: { items: { include: { product: true } }, customer: true, createdBy: true },
    orderBy: { createdAt: "desc" },
  });
  return res.json(orders);
}

export async function getOrder(req: Request, res: Response) {
  const order = await prisma.order.findUnique({
    where: { id: String(req.params.id) },
    include: { items: { include: { product: true } }, customer: true, createdBy: true },
  });
  if (!order) return res.status(404).json({ error: "Order not found" });
  return res.json(order);
}

const updateStatusSchema = z.object({
  status: z.enum(["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"]),
});

export async function updateOrderStatus(req: Request, res: Response) {
  const parsed = updateStatusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const existing: Prisma.OrderGetPayload<{ include: { items: true; customer: true } }> | null =
    await prisma.order.findUnique({
      where: { id: String(req.params.id) },
      include: { items: true, customer: true },
    });
  if (!existing) return res.status(404).json({ error: "Order not found" });

  // If cancelling an order that had stock deducted, restore it.
  if (parsed.data.status === "CANCELLED" && existing.status !== "CANCELLED") {
    await prisma.$transaction(async (tx) => {
      for (const item of existing.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            change: item.quantity,
            reason: "RETURN",
            orderId: existing.id,
            createdById: req.user?.userId,
          },
        });
      }
      await tx.order.update({ where: { id: existing.id }, data: { status: "CANCELLED" } });
    });

    await logAudit({
      action: "ORDER_CANCELLED",
      actorId: req.user?.userId,
      targetType: "Order",
      targetId: existing.id,
      metadata: { orderNumber: existing.orderNumber, totalAmount: existing.totalAmount },
    });

    if (existing.customer?.email) {
      sendOrderStatusUpdateEmail(existing.customer.email, {
        orderNumber: existing.orderNumber,
        status: "CANCELLED",
        customerName: existing.customer.name,
      }).catch((err) => console.error("Failed to send cancellation email:", err));
    }

    return res.json({ message: "Order cancelled and stock restored" });
  }

  const updated = await prisma.order.update({
    where: { id: String(req.params.id) },
    data: { status: parsed.data.status },
  });

  if (existing.customer?.email && parsed.data.status !== existing.status) {
    sendOrderStatusUpdateEmail(existing.customer.email, {
      orderNumber: existing.orderNumber,
      status: parsed.data.status,
      customerName: existing.customer.name,
    }).catch((err) => console.error("Failed to send status update email:", err));
  }

  return res.json(updated);
}
