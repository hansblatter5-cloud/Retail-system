"use client";

import Link from "next/link";
import { Product, formatKES } from "@/lib/api";
import { useCart } from "@/lib/cart-context";
import { Package } from "lucide-react";

export function ProductCard({ product }: { product: Product }) {
  const { addToCart } = useCart();
  const outOfStock = product.stock <= 0;

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-elev-sm transition-all hover:-translate-y-0.5 hover:shadow-elev-md">
      <Link href={`/products/${product.id}`} className="block aspect-square overflow-hidden bg-line/40">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-ink/20">
            <Package size={48} />
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <Link href={`/products/${product.id}`}>
          <h3 className="font-display font-semibold text-ink line-clamp-1">{product.name}</h3>
        </Link>
        {product.category && <p className="text-xs uppercase tracking-wide text-ink/50">{product.category.name}</p>}
        <p className="font-ledger mt-auto font-semibold text-teal">{formatKES(product.price)}</p>

        {outOfStock ? (
          <span className="rounded-full bg-danger/10 px-3 py-1.5 text-center text-xs font-medium text-danger">
            Out of stock
          </span>
        ) : (
          <button
            onClick={() => addToCart(product, 1)}
            className="rounded-full bg-teal px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-deep"
          >
            Add to cart
          </button>
        )}
      </div>
    </div>
  );
}
