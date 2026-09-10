"use client";

import { useState } from "react";
import { Package } from "lucide-react";

interface ProductImage {
  id: string;
  url: string;
}

interface ProductGalleryProps {
  images: ProductImage[];
  fallbackImageUrl: string | null;
  productName: string;
}

// Products created before the multi-image upload existed only have
// `imageUrl` and no `images[]` — fall back to a single-image gallery so old
// listings still render correctly.
export function ProductGallery({ images, fallbackImageUrl, productName }: ProductGalleryProps) {
  const gallery = images.length > 0 ? images : fallbackImageUrl ? [{ id: "cover", url: fallbackImageUrl }] : [];
  const [activeIndex, setActiveIndex] = useState(0);
  const active = gallery[activeIndex];

  return (
    <div className="flex flex-col gap-3">
      <div className="aspect-square overflow-hidden rounded-2xl border border-line bg-line/40 shadow-elev-sm">
        {active ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={active.url} alt={productName} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-ink/20">
            <Package size={64} />
          </div>
        )}
      </div>

      {gallery.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {gallery.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setActiveIndex(i)}
              className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                i === activeIndex ? "border-teal" : "border-transparent"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt={`${productName} ${i + 1}`} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
