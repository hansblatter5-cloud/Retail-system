"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api, Order, OrderStatus, formatKES, getErrorMessage } from "@/lib/api";
import { Search, ShoppingCart, Receipt } from "lucide-react";
import { SkeletonRow } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { ReceiptModal } from "@/components/ReceiptModal";

const STATUS_OPTIONS: OrderStatus[] = ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"];

const STATUS_COLORS: Record<OrderStatus, string> = {
  PENDING: "bg-gold/15 text-gold",
  PROCESSING: "bg-teal/15 text-teal",
  SHIPPED: "bg-teal/15 text-teal",
  DELIVERED: "bg-success/15 text-success",
  CANCELLED: "bg-danger/15 text-danger",
};

export default function OrdersPage() {
  const { token } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);

  function loadOrders() {
    if (!token) return;
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    api
      .get<Order[]>(`/orders?${params.toString()}`, token)
      .then(setOrders)
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, search, statusFilter]);

  async function handleStatusChange(orderId: string, status: OrderStatus) {
    if (!token) return;
    try {
      await api.patch(`/orders/${orderId}/status`, { status }, token);
      loadOrders();
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  return (
    <div>
      <h1 className="font-display mb-1 text-2xl font-bold">Orders</h1>
      <p className="mb-6 text-sm text-ink/50">View and manage every order, online and in-store.</p>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" size={16} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order # or customer..."
            className="w-full rounded-full border border-line bg-white py-2.5 pl-9 pr-4 text-sm outline-none focus:border-teal"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-full border border-line bg-white px-4 py-2.5 text-sm outline-none focus:border-teal"
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="mb-4 rounded-xl bg-danger/10 p-3 text-sm text-danger">{error}</p>}

      <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-elev-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-ink/50">
              <th className="px-4 py-3 font-medium">Order #</th>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Channel</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} columns={7} />)
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10">
                  <EmptyState
                    icon={ShoppingCart}
                    title="No orders found"
                    description={search || statusFilter ? "Try a different search or filter." : "Orders will appear here as they come in."}
                  />
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id} className="border-b border-line last:border-0">
                  <td className="font-ledger px-4 py-3 font-medium">{order.orderNumber}</td>
                  <td className="px-4 py-3">{order.customer?.name || "Walk-in"}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-line/50 px-2.5 py-1 text-xs capitalize">
                      {order.channel === "IN_STORE" ? "In-store" : "Online"}
                    </span>
                  </td>
                  <td className="font-ledger px-4 py-3">{formatKES(order.totalAmount)}</td>
                  <td className="px-4 py-3">
                    <select
                      value={order.status}
                      onChange={(e) => handleStatusChange(order.id, e.target.value as OrderStatus)}
                      className={`rounded-full border-0 px-2.5 py-1 text-xs font-medium ${STATUS_COLORS[order.status]}`}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-ink/50">{new Date(order.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setReceiptOrder(order)}
                      className="flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-xs hover:bg-line/40"
                    >
                      <Receipt size={12} /> Receipt
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {receiptOrder && <ReceiptModal order={receiptOrder} onClose={() => setReceiptOrder(null)} />}
    </div>
  );
}
