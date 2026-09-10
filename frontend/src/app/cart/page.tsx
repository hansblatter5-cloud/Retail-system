"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart-context";
import { formatKES } from "@/lib/api";
import { Navbar } from "@/components/Navbar";
import { EmptyState } from "@/components/EmptyState";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";

export default function CartPage() {
  const { lines, updateQuantity, removeFromCart, totalAmount } = useCart();
  const router = useRouter();

  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <h1 className="font-display mb-6 text-2xl font-bold">Your cart</h1>

        {lines.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title="Your cart is empty"
            description="Add something from the shop to get started."
            action={
              <Link
                href="/"
                className="rounded-full bg-teal px-5 py-2.5 text-sm font-medium text-white hover:bg-teal-deep"
              >
                Continue shopping
              </Link>
            }
          />
        ) : (
          <>
            <div className="flex flex-col gap-4">
              {lines.map((line) => (
                <div
                  key={line.product.id}
                  className="flex items-center gap-4 rounded-2xl border border-line bg-white p-4 shadow-elev-sm"
                >
                  <div className="flex-1">
                    <p className="font-medium">{line.product.name}</p>
                    <p className="font-ledger text-sm text-ink/50">{formatKES(line.product.price)} each</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(line.product.id, line.quantity - 1)}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-line hover:bg-line/40"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="font-ledger w-6 text-center text-sm">{line.quantity}</span>
                    <button
                      onClick={() =>
                        updateQuantity(line.product.id, Math.min(line.product.stock, line.quantity + 1))
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-line hover:bg-line/40"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  <p className="font-ledger w-28 text-right font-medium">
                    {formatKES(line.product.price * line.quantity)}
                  </p>

                  <button
                    onClick={() => removeFromCart(line.product.id)}
                    className="text-ink/40 hover:text-danger"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-8 flex items-center justify-between rounded-2xl bg-ink px-6 py-5 text-white shadow-elev-md">
              <span className="font-display text-lg">Total</span>
              <span className="font-ledger text-xl font-bold">{formatKES(totalAmount)}</span>
            </div>

            <button
              onClick={() => router.push("/checkout")}
              className="mt-6 w-full rounded-full bg-teal py-3.5 font-medium text-white transition-colors hover:bg-teal-deep"
            >
              Proceed to checkout
            </button>
          </>
        )}
      </main>
    </>
  );
}
