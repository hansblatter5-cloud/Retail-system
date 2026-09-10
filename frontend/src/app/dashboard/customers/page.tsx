"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api, Customer, formatKES, getErrorMessage } from "@/lib/api";
import { Search, X, Users } from "lucide-react";
import { SkeletonRow } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";

interface CustomerWithOrders extends Customer {
  orders?: { id: string; orderNumber: string; totalAmount: number; createdAt: string; status: string }[];
}

export default function CustomersPage() {
  const { token } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<CustomerWithOrders | null>(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    api
      .get<Customer[]>(`/customers?${params.toString()}`, token)
      .then(setCustomers)
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [token, search]);

  async function viewCustomer(id: string) {
    if (!token) return;
    try {
      const data = await api.get<CustomerWithOrders>(`/customers/${id}`, token);
      setSelected(data);
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  return (
    <div>
      <h1 className="font-display mb-1 text-2xl font-bold">Customers</h1>
      <p className="mb-6 text-sm text-ink/50">Everyone who has ordered from the store.</p>

      <div className="relative mb-5 w-full max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" size={16} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, phone, email..."
          className="w-full rounded-full border border-line bg-white py-2.5 pl-9 pr-4 text-sm outline-none focus:border-teal"
        />
      </div>

      {error && <p className="mb-4 rounded-xl bg-danger/10 p-3 text-sm text-danger">{error}</p>}

      <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-elev-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-ink/50">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Joined</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} columns={5} />)
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10">
                  <EmptyState
                    icon={Users}
                    title="No customers yet"
                    description="Customers appear here automatically after their first order."
                  />
                </td>
              </tr>
            ) : (
              customers.map((c) => (
                <tr key={c.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="font-ledger px-4 py-3 text-ink/50">{c.phone || "—"}</td>
                  <td className="px-4 py-3 text-ink/50">{c.email || "—"}</td>
                  <td className="px-4 py-3 text-ink/50">{new Date(c.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => viewCustomer(c.id)}
                      className="rounded-full border border-line px-2.5 py-1 text-xs hover:bg-line/40"
                    >
                      View history
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-elev-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">{selected.name}</h2>
              <button onClick={() => setSelected(null)} className="text-ink/40 hover:text-ink">
                <X size={20} />
              </button>
            </div>
            <p className="font-ledger mb-1 text-sm text-ink/60">{selected.phone}</p>
            <p className="mb-4 text-sm text-ink/60">{selected.email}</p>

            <p className="mb-2 font-display text-sm font-semibold">Order history</p>
            {!selected.orders || selected.orders.length === 0 ? (
              <p className="text-sm text-ink/50">No orders yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {selected.orders.map((o) => (
                  <li key={o.id} className="flex items-center justify-between rounded-xl border border-line p-3 text-sm">
                    <span className="font-ledger">{o.orderNumber}</span>
                    <span className="text-ink/50">{new Date(o.createdAt).toLocaleDateString()}</span>
                    <span className="font-ledger font-medium">{formatKES(o.totalAmount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
