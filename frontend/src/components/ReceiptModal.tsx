"use client";

import { useState } from "react";
import { formatKES, Order } from "@/lib/api";
import { LogoMark } from "./LogoMark";
import { X, Printer } from "lucide-react";

type PaperWidth = "standard" | "80mm" | "58mm";

const WIDTH_STYLE: Record<PaperWidth, React.CSSProperties> = {
  standard: {},
  "80mm": { width: "80mm", maxWidth: "80mm" },
  "58mm": { width: "58mm", maxWidth: "58mm" },
};

export function ReceiptModal({ order, onClose }: { order: Order; onClose: () => void }) {
  const [paperWidth, setPaperWidth] = useState<PaperWidth>("standard");
  const thermal = paperWidth !== "standard";

  return (
    <div className="receipt-overlay fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div
        className={`print-receipt max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-elev-lg ${
          thermal ? "" : "w-full max-w-sm"
        }`}
        style={WIDTH_STYLE[paperWidth]}
      >
        <div className="no-print flex flex-col gap-3 border-b border-line p-4">
          <div className="flex items-center justify-between">
            <p className="font-display font-semibold">Receipt</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 rounded-full bg-teal px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-deep"
              >
                <Printer size={14} /> Print
              </button>
              <button onClick={onClose} className="text-ink/40 hover:text-ink">
                <X size={20} />
              </button>
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-medium text-ink/50">Paper size</p>
            <div className="flex gap-1.5">
              {(
                [
                  { key: "standard", label: "Standard (A4)" },
                  { key: "80mm", label: "80mm printer" },
                  { key: "58mm", label: "58mm printer" },
                ] as { key: PaperWidth; label: string }[]
              ).map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setPaperWidth(opt.key)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    paperWidth === opt.key ? "bg-ink text-white" : "border border-line text-ink/60 hover:bg-line/40"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {thermal && (
              <p className="mt-1.5 text-xs text-ink/40">
                In the print dialog, select your receipt printer and match its paper size for a clean cut.
              </p>
            )}
          </div>
        </div>

        <div className={`font-ledger ${thermal ? "p-3" : "p-6"}`}>
          <div className={`flex flex-col items-center text-center ${thermal ? "mb-2" : "mb-4"}`}>
            <LogoMark size={thermal ? 22 : 36} />
            <p className={`font-display mt-1.5 font-bold not-italic tracking-tight ${thermal ? "text-sm" : "text-base"}`}>
              Daniel&apos;s Store
            </p>
            <p className={`mt-0.5 text-ink/50 ${thermal ? "text-[10px]" : "text-xs"}`}>
              {order.channel === "IN_STORE" ? "In-store sale" : "Online order"}
            </p>
          </div>

          <div className={`border-y border-dashed border-line text-ink/60 ${thermal ? "mb-2 py-2 text-[10px]" : "mb-4 py-3 text-xs"}`}>
            <div className="flex justify-between">
              <span>Receipt #</span>
              <span>{order.orderNumber}</span>
            </div>
            <div className="flex justify-between">
              <span>Date</span>
              <span>{new Date(order.createdAt).toLocaleString()}</span>
            </div>
            {order.customer?.name && (
              <div className="flex justify-between">
                <span>Customer</span>
                <span>{order.customer.name}</span>
              </div>
            )}
          </div>

          <div className={`flex flex-col ${thermal ? "gap-1" : "gap-2"}`}>
            {order.items.map((item) => (
              <div key={item.id} className={`flex justify-between ${thermal ? "text-[11px]" : "text-sm"}`}>
                <span className="max-w-[60%] truncate">
                  {item.product.name} × {item.quantity}
                </span>
                <span>{formatKES(item.subtotal)}</span>
              </div>
            ))}
          </div>

          <div
            className={`flex justify-between border-t border-dashed border-line font-semibold ${
              thermal ? "mt-2 pt-2 text-sm" : "mt-4 pt-3 text-base"
            }`}
          >
            <span>Total</span>
            <span>{formatKES(order.totalAmount)}</span>
          </div>

          <p className={`text-center text-ink/40 ${thermal ? "mt-3 text-[10px]" : "mt-6 text-xs"}`}>
            Thank you for shopping with us.
          </p>
        </div>
      </div>
    </div>
  );
}
