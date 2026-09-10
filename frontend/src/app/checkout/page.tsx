"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart-context";
import { api, formatKES, Order, ShippingEstimate, getErrorMessage } from "@/lib/api";
import { Navbar } from "@/components/Navbar";
import { ShippingEstimator } from "@/components/ShippingEstimator";

export default function CheckoutPage() {
  const { lines, totalAmount, clearCart } = useCart();
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [shippingEstimate, setShippingEstimate] = useState<ShippingEstimate | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name || !phone) {
      setError("Please provide at least your name and phone number so we can reach you about the order.");
      return;
    }

    // The order total below reflects item subtotal only — the backend
    // doesn't have a shipping-cost field on Order yet, so the quoted
    // delivery zone/cost is appended to notes for staff to see and add
    // manually when fulfilling. If you want shipping charged automatically,
    // Order needs a shippingCost field added on the backend first.
    const shippingNote = shippingEstimate
      ? `Delivery: ${shippingEstimate.zone} — ${
          shippingEstimate.freeShippingApplied ? "Free shipping" : formatKES(shippingEstimate.shippingCost)
        } (${shippingEstimate.estDeliveryDaysMin}-${shippingEstimate.estDeliveryDaysMax} days)`
      : null;
    const combinedNotes = [notes || null, shippingNote].filter(Boolean).join(" | ") || undefined;

    setSubmitting(true);
    try {
      const order = await api.post<Order>("/orders", {
        channel: "ONLINE",
        items: lines.map((l) => ({ productId: l.product.id, quantity: l.quantity })),
        customer: { name, phone, email: email || undefined, address: address || undefined },
        notes: combinedNotes,
      });
      setConfirmedOrder(order);
      clearCart();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmedOrder) {
    const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
    const whatsappUrl = whatsappNumber
      ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
          `Hi! I just placed order ${confirmedOrder.orderNumber} on the website and had a question about it.`
        )}`
      : null;

    return (
      <>
        <Navbar />
        <main className="mx-auto w-full max-w-lg flex-1 px-6 py-16 text-center">
          <h1 className="font-display text-2xl font-bold text-teal">Order confirmed</h1>
          <p className="mt-3 text-ink/70">
            Thank you! Your order <span className="font-ledger font-medium text-ink">{confirmedOrder.orderNumber}</span> has
            been received and is being prepared.
          </p>
          <p className="font-ledger mt-1 text-ink/70">Total: {formatKES(confirmedOrder.totalAmount)}</p>

          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-block text-sm font-medium text-teal underline underline-offset-4"
            >
              Message us on WhatsApp about this order
            </a>
          )}

          <div>
            <button
              onClick={() => router.push("/")}
              className="mt-8 rounded-full bg-teal px-6 py-3 font-medium text-white hover:bg-teal-deep"
            >
              Back to shop
            </button>
          </div>
        </main>
      </>
    );
  }

  if (lines.length === 0) {
    return (
      <>
        <Navbar />
        <main className="mx-auto w-full max-w-lg flex-1 px-6 py-16 text-center text-ink/50">
          Your cart is empty. Add something before checking out.
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-lg flex-1 px-6 py-10">
        <h1 className="font-display mb-6 text-2xl font-bold">Checkout</h1>

        <div className="mb-6 rounded-2xl border border-line bg-white p-4 shadow-elev-sm">
          {lines.map((l) => (
            <div key={l.product.id} className="flex justify-between py-1 text-sm">
              <span>
                {l.product.name} × <span className="font-ledger">{l.quantity}</span>
              </span>
              <span className="font-ledger">{formatKES(l.product.price * l.quantity)}</span>
            </div>
          ))}
          <div className="mt-2 flex justify-between border-t border-line pt-2 font-semibold">
            <span>Total</span>
            <span className="font-ledger">{formatKES(totalAmount)}</span>
          </div>
        </div>

        <div className="mb-6">
          <ShippingEstimator subtotal={totalAmount} onEstimateChange={setShippingEstimate} />
        </div>

        {error && <p className="mb-4 rounded-xl bg-danger/10 p-3 text-sm text-danger">{error}</p>}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            required
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-xl border border-line px-4 py-3 outline-none focus:border-teal"
          />
          <input
            required
            placeholder="Phone number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="rounded-xl border border-line px-4 py-3 outline-none focus:border-teal"
          />
          <input
            type="email"
            placeholder="Email (optional)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-xl border border-line px-4 py-3 outline-none focus:border-teal"
          />
          <input
            placeholder="Delivery address (optional)"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="rounded-xl border border-line px-4 py-3 outline-none focus:border-teal"
          />
          <textarea
            placeholder="Order notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="rounded-xl border border-line px-4 py-3 outline-none focus:border-teal"
            rows={3}
          />

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 rounded-full bg-teal py-3.5 font-medium text-white transition-colors hover:bg-teal-deep disabled:opacity-50"
          >
            {submitting ? "Placing order..." : `Place order — ${formatKES(totalAmount)}`}
          </button>
        </form>
      </main>
    </>
  );
}
