"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api, Product, Order, formatKES, getErrorMessage } from "@/lib/api";
import { Search, Minus, Plus, Trash2, Receipt, ScanLine } from "lucide-react";
import { ReceiptModal } from "@/components/ReceiptModal";

interface Line {
  product: Product;
  quantity: number;
}

export default function POSPage() {
  const { token } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [scanFeedback, setScanFeedback] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState<Order | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!token) return;
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    api.get<Product[]>(`/products?${params.toString()}`, token).then(setProducts).catch(() => {});
  }, [token, search]);

  // Keep the search box focused by default — a barcode scanner is just a very
  // fast keyboard, so the cursor needs to already be sitting in this field
  // for a scan to land anywhere. Refocus after every add so a cashier never
  // has to click back into the box between scans.
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!scanFeedback) return;
    const t = setTimeout(() => setScanFeedback(null), 2200);
    return () => clearTimeout(t);
  }, [scanFeedback]);

  function addLine(product: Product) {
    setLines((prev) => {
      const existing = prev.find((l) => l.product.id === product.id);
      if (existing) {
        return prev.map((l) =>
          l.product.id === product.id ? { ...l, quantity: Math.min(l.quantity + 1, product.stock) } : l
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  }

  function updateQty(productId: string, qty: number) {
    setLines((prev) =>
      prev.map((l) => (l.product.id === productId ? { ...l, quantity: qty } : l)).filter((l) => l.quantity > 0)
    );
  }

  // Barcode scanners send the code as fast keystrokes terminated by Enter.
  // On Enter, look up an exact SKU match and add it straight to the sale —
  // no tapping required, matching how a real POS scanner workflow works.
  async function handleScanEnter(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const code = search.trim();
    if (!code || !token) return;

    try {
      const results = await api.get<Product[]>(`/products?search=${encodeURIComponent(code)}`, token);
      const exactSku = results.find((p) => p.sku.toLowerCase() === code.toLowerCase());
      const target = exactSku || (results.length === 1 ? results[0] : null);

      if (!target) {
        setScanFeedback({ type: "error", text: `No product found for "${code}"` });
        return;
      }
      if (target.stock <= 0) {
        setScanFeedback({ type: "error", text: `${target.name} is out of stock` });
        return;
      }
      addLine(target);
      setScanFeedback({ type: "ok", text: `Added ${target.name}` });
      setSearch("");
    } catch (err) {
      setScanFeedback({ type: "error", text: getErrorMessage(err) });
    }
  }

  const total = lines.reduce((sum, l) => sum + l.product.price * l.quantity, 0);

  async function handleCompleteSale() {
    if (!token || lines.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const order = await api.post<Order>(
        "/orders",
        {
          channel: "IN_STORE",
          items: lines.map((l) => ({ productId: l.product.id, quantity: l.quantity })),
          customer: customerName ? { name: customerName, phone: customerPhone || undefined } : undefined,
        },
        token
      );
      setConfirmed(order);
      setLines([]);
      setCustomerName("");
      setCustomerPhone("");
      searchInputRef.current?.focus();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="font-display mb-1 text-2xl font-bold">Point of Sale</h1>
      <p className="mb-6 text-sm text-ink/50">Log an in-store sale. Stock updates immediately, same as online orders.</p>

      {confirmed && (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-success/30 bg-success/10 p-4 text-sm shadow-elev-sm">
          <span>
            Sale recorded — <span className="font-ledger font-medium">{confirmed.orderNumber}</span> for{" "}
            <span className="font-ledger">{formatKES(confirmed.totalAmount)}</span>.
          </span>
          <button
            onClick={() => setShowReceipt(true)}
            className="flex items-center gap-1 rounded-full border border-success/40 px-3 py-1 text-xs font-medium text-success hover:bg-success/10"
          >
            <Receipt size={12} /> View receipt
          </button>
          <button onClick={() => setConfirmed(null)} className="ml-auto text-xs underline underline-offset-4">
            Dismiss
          </button>
        </div>
      )}

      {error && <p className="mb-4 rounded-xl bg-danger/10 p-3 text-sm text-danger">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="relative mb-2">
            <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 text-teal" size={16} />
            <input
              ref={searchInputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleScanEnter}
              placeholder="Scan a barcode, or type a name / SKU..."
              autoComplete="off"
              className="w-full rounded-full border-2 border-teal/30 bg-white py-2.5 pl-9 pr-4 text-sm outline-none focus:border-teal"
            />
          </div>
          <div className="mb-4 flex items-center gap-1.5 text-xs text-ink/40">
            <Search size={12} />
            Typing filters the tiles below; scanning (then Enter) adds the item straight to the sale.
          </div>
          {scanFeedback && (
            <div
              className={`mb-4 rounded-xl px-3 py-2 text-sm ${
                scanFeedback.type === "ok" ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
              }`}
            >
              {scanFeedback.text}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {products.map((p) => (
              <button
                key={p.id}
                onClick={() => addLine(p)}
                disabled={p.stock <= 0}
                className="rounded-xl border border-line bg-white p-3 text-left text-sm shadow-elev-sm transition-shadow hover:border-teal hover:shadow-elev-md disabled:opacity-40"
              >
                <p className="font-medium line-clamp-1">{p.name}</p>
                <p className="font-ledger text-ink/50">{formatKES(p.price)}</p>
                <p className="font-ledger text-xs text-ink/40">{p.stock} in stock</p>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-white p-5 shadow-elev-sm">
          <p className="mb-3 font-display font-semibold">Current sale</p>

          {lines.length === 0 ? (
            <p className="text-sm text-ink/50">Scan or tap products to add them to this sale.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {lines.map((l) => (
                <div key={l.product.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex-1 line-clamp-1">{l.product.name}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateQty(l.product.id, l.quantity - 1)}
                      className="flex h-6 w-6 items-center justify-center rounded-full border border-line"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="font-ledger w-5 text-center">{l.quantity}</span>
                    <button
                      onClick={() => updateQty(l.product.id, Math.min(l.product.stock, l.quantity + 1))}
                      className="flex h-6 w-6 items-center justify-center rounded-full border border-line"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                  <button onClick={() => updateQty(l.product.id, 0)} className="text-ink/30 hover:text-danger">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}

              <div className="mt-2 flex justify-between border-t border-line pt-3 font-semibold">
                <span>Total</span>
                <span className="font-ledger">{formatKES(total)}</span>
              </div>

              <input
                placeholder="Customer name (optional)"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="mt-3 rounded-xl border border-line px-3 py-2 text-sm outline-none focus:border-teal"
              />
              <input
                placeholder="Phone (optional)"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="rounded-xl border border-line px-3 py-2 text-sm outline-none focus:border-teal"
              />

              <button
                onClick={handleCompleteSale}
                disabled={submitting}
                className="mt-3 rounded-full bg-teal py-3 text-sm font-medium text-white hover:bg-teal-deep disabled:opacity-50"
              >
                {submitting ? "Recording sale..." : "Complete sale"}
              </button>
            </div>
          )}
        </div>
      </div>

      {showReceipt && confirmed && <ReceiptModal order={confirmed} onClose={() => setShowReceipt(false)} />}
    </div>
  );
}
