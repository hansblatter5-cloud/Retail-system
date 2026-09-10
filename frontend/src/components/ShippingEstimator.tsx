"use client";

import { useEffect, useState } from "react";
import { api, formatKES, ShippingZone, ShippingEstimate } from "@/lib/api";
import { Truck } from "lucide-react";

// `subtotal` is the current cart/line subtotal in whole KSh — pass
// product.price * quantity on the product page, or the cart total at checkout.
// `onEstimateChange` fires whenever the resolved estimate changes, so a
// parent (e.g. checkout) can fold the chosen zone/cost into the order.
export function ShippingEstimator({
  subtotal,
  onEstimateChange,
}: {
  subtotal: number;
  onEstimateChange?: (estimate: ShippingEstimate | null) => void;
}) {
  const [zones, setZones] = useState<ShippingZone[]>([]);
  const [zoneId, setZoneId] = useState<string>("");
  const [estimate, setEstimate] = useState<ShippingEstimate | null>(null);

  useEffect(() => {
    api
      .get<ShippingZone[]>("/shipping-zones")
      .then((z) => {
        setZones(z);
        if (z.length > 0) setZoneId(z[0].id);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!zoneId) return;
    api
      .get<ShippingEstimate>(`/shipping-zones/calculate?zoneId=${zoneId}&subtotal=${subtotal}`)
      .then((est) => {
        setEstimate(est);
        onEstimateChange?.(est);
      })
      .catch(() => setEstimate(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoneId, subtotal]);

  if (zones.length === 0) return null;

  return (
    <div className="rounded-2xl border border-line p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-ink">
        <Truck size={16} className="text-teal" />
        Delivery estimate
      </div>

      <select
        value={zoneId}
        onChange={(e) => setZoneId(e.target.value)}
        className="mt-3 w-full rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-teal"
      >
        {zones.map((z) => (
          <option key={z.id} value={z.id}>
            {z.name}
          </option>
        ))}
      </select>

      {estimate && (
        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="text-ink/60">
            {estimate.estDeliveryDaysMin === 0
              ? `Same day – ${estimate.estDeliveryDaysMax} day${estimate.estDeliveryDaysMax === 1 ? "" : "s"}`
              : `${estimate.estDeliveryDaysMin}–${estimate.estDeliveryDaysMax} days`}
          </span>
          <span className="font-ledger font-medium text-ink">
            {estimate.freeShippingApplied ? (
              <span className="text-teal">Free</span>
            ) : (
              formatKES(estimate.shippingCost)
            )}
          </span>
        </div>
      )}
    </div>
  );
}
