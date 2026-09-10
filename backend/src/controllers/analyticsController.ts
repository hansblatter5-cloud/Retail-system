import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { queryString } from "../utils/queryString";

// Powers the main dashboard: revenue, order volume, top products, low stock.
export async function dashboardSummary(req: Request, res: Response) {
  const days = Number(queryString(req.query.days) ?? "30");
  const since = new Date();
  since.setDate(since.getDate() - (Number.isFinite(days) ? days : 30));

  const orders = await prisma.order.findMany({
    where: { createdAt: { gte: since }, status: { not: "CANCELLED" } },
    include: { items: true },
  });

  const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const totalOrders = orders.length;
  const onlineOrders = orders.filter((o) => o.channel === "ONLINE").length;
  const inStoreOrders = orders.filter((o) => o.channel === "IN_STORE").length;

  // Revenue grouped by day for a simple trend chart.
  const revenueByDay: Record<string, number> = {};
  for (const order of orders) {
    const day = order.createdAt.toISOString().slice(0, 10);
    revenueByDay[day] = (revenueByDay[day] || 0) + order.totalAmount;
  }

  // Top-selling products by quantity.
  const productSales: Record<string, number> = {};
  for (const order of orders) {
    for (const item of order.items) {
      productSales[item.productId] = (productSales[item.productId] || 0) + item.quantity;
    }
  }
  const topProductIds = Object.entries(productSales)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id);
  const topProducts = await prisma.product.findMany({ where: { id: { in: topProductIds } } });
  const topProductsWithSales = topProducts
    .map((p) => ({ ...p, unitsSold: productSales[p.id] || 0 }))
    .sort((a, b) => b.unitsSold - a.unitsSold);

  const allProducts = await prisma.product.findMany({ where: { isActive: true } });
  const lowStockCount = allProducts.filter((p) => p.stock <= p.lowStockThreshold).length;

  const totalCustomers = await prisma.customer.count();
  const pendingStaff = await prisma.user.count({ where: { status: "PENDING" } });

  return res.json({
    totalRevenue,
    totalOrders,
    onlineOrders,
    inStoreOrders,
    revenueByDay,
    topProducts: topProductsWithSales,
    lowStockCount,
    totalCustomers,
    pendingStaff,
  });
}
