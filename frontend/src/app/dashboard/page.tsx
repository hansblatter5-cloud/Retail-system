"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api, formatKES, getErrorMessage } from "@/lib/api";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { TrendingUp, ShoppingCart, Package, Users, AlertTriangle, UserCheck, LucideIcon, BarChart3 } from "lucide-react";
import { SkeletonStatCard, Skeleton } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";

interface DashboardSummary {
  totalRevenue: number;
  totalOrders: number;
  onlineOrders: number;
  inStoreOrders: number;
  revenueByDay: Record<string, number>;
  topProducts: { id: string; name: string; unitsSold: number }[];
  lowStockCount: number;
  totalCustomers: number;
  pendingStaff: number;
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-elev-sm transition-shadow hover:shadow-elev-md">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-ink/50">{label}</p>
        <Icon size={18} className={accent || "text-teal"} />
      </div>
      <p className="font-ledger text-2xl font-bold">{value}</p>
    </div>
  );
}

export default function DashboardOverview() {
  const { token } = useAuth();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    api
      .get<DashboardSummary>("/analytics/dashboard?days=30", token)
      .then(setData)
      .catch((e) => setError(getErrorMessage(e)));
  }, [token]);

  if (error) return <p className="rounded-xl bg-danger/10 p-4 text-sm text-danger">{error}</p>;

  if (!data) {
    return (
      <div>
        <h1 className="font-display mb-1 text-2xl font-bold">Overview</h1>
        <p className="mb-8 text-sm text-ink/50">Business performance over the last 30 days</p>
        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonStatCard key={i} />
          ))}
        </div>
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
    );
  }

  const chartData = Object.entries(data.revenueByDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, revenue]) => ({ date: date.slice(5), revenue }));

  return (
    <div>
      <h1 className="font-display mb-1 text-2xl font-bold">Overview</h1>
      <p className="mb-8 text-sm text-ink/50">Business performance over the last 30 days</p>

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Revenue (30d)" value={formatKES(data.totalRevenue)} icon={TrendingUp} />
        <StatCard label="Orders (30d)" value={String(data.totalOrders)} icon={ShoppingCart} />
        <StatCard
          label="Low stock items"
          value={String(data.lowStockCount)}
          icon={AlertTriangle}
          accent={data.lowStockCount > 0 ? "text-danger" : "text-teal"}
        />
        <StatCard label="Total customers" value={String(data.totalCustomers)} icon={Users} />
      </div>

      {data.pendingStaff > 0 && (
        <div className="mb-8 flex items-center gap-3 rounded-2xl border border-gold/30 bg-gold/10 p-4 shadow-elev-sm">
          <UserCheck size={18} className="text-gold shrink-0" />
          <p className="text-sm text-ink/80">
            <span className="font-ledger font-semibold">{data.pendingStaff}</span> staff signup
            {data.pendingStaff > 1 ? "s" : ""} waiting for approval —{" "}
            <a href="/dashboard/staff" className="font-medium text-teal underline underline-offset-4">
              review now
            </a>
          </p>
        </div>
      )}

      <div className="mb-8 rounded-2xl border border-line bg-white p-6 shadow-elev-sm">
        <p className="mb-4 font-display font-semibold">Revenue trend</p>
        {chartData.length === 0 ? (
          <EmptyState icon={BarChart3} title="No revenue yet" description="Sales will chart here as orders come in." />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E4DFD3" />
              <XAxis dataKey="date" tick={{ fontSize: 12, fontFamily: "var(--font-ibm-plex-mono)" }} />
              <YAxis tick={{ fontSize: 12, fontFamily: "var(--font-ibm-plex-mono)" }} width={70} />
              <Tooltip formatter={(v) => formatKES(Number(v))} />
              <Line type="monotone" dataKey="revenue" stroke="#0F4C4C" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-2xl border border-line bg-white p-6 shadow-elev-sm">
          <p className="mb-4 font-display font-semibold">Top-selling products</p>
          {data.topProducts.length === 0 ? (
            <p className="text-sm text-ink/50">No sales yet in this period.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {data.topProducts.map((p, i) => (
                <li key={p.id} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="font-ledger flex h-6 w-6 items-center justify-center rounded-full bg-teal/10 text-xs font-semibold text-teal">
                      {i + 1}
                    </span>
                    {p.name}
                  </span>
                  <span className="font-ledger text-ink/50">{p.unitsSold} sold</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-line bg-white p-6 shadow-elev-sm">
          <p className="mb-4 font-display font-semibold">Sales channel split</p>
          <div className="flex items-center gap-2">
            <Package size={16} className="text-teal" />
            <span className="text-sm">
              Online: <span className="font-ledger">{data.onlineOrders}</span> orders
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <Package size={16} className="text-gold" />
            <span className="text-sm">
              In-store: <span className="font-ledger">{data.inStoreOrders}</span> orders
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
