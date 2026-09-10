"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, Product, formatKES, getErrorMessage } from "@/lib/api";
import { Navbar } from "@/components/Navbar";
import { useCart } from "@/lib/cart-context";
import { Minus, Plus } from "lucide-react";
import { Skeleton } from "@/components/Skeleton";
import { ProductGallery } from "@/components/ProductGallery";
import { StarRating } from "@/components/StarRating";
import { ReviewsSection } from "@/components/ReviewsSection";
import { QnASection } from "@/components/QnASection";
import { ShippingEstimator } from "@/components/ShippingEstimator";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { addToCart } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    const id = params.id as string;
    api
      .get<Product>(`/products/${id}`)
      .then(setProduct)
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [params.id]);

  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        {loading ? (
          <div className="grid gap-10 sm:grid-cols-2">
            <Skeleton className="aspect-square w-full rounded-2xl" />
            <div className="flex flex-col gap-3">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-7 w-32" />
              <Skeleton className="mt-2 h-16 w-full" />
              <Skeleton className="mt-4 h-12 w-40 rounded-full" />
            </div>
          </div>
        ) : error || !product ? (
          <p className="text-danger">{error || "Product not found."}</p>
        ) : (
          <div className="flex flex-col gap-10">
            <div className="grid gap-10 sm:grid-cols-2">
              <ProductGallery
                images={product.images ?? []}
                fallbackImageUrl={product.imageUrl}
                productName={product.name}
              />

              <div className="flex flex-col">
                {product.category && (
                  <p className="mb-1 text-xs uppercase tracking-wide text-ink/50">{product.category.name}</p>
                )}
                <h1 className="font-display text-2xl font-bold text-ink">{product.name}</h1>

                {product.reviewCount > 0 && (
                  <div className="mt-1.5">
                    <StarRating value={product.avgRating ?? 0} count={product.reviewCount} />
                  </div>
                )}

                <p className="font-ledger mt-3 text-2xl font-semibold text-teal">{formatKES(product.price)}</p>

                {product.description && <p className="mt-4 text-ink/70">{product.description}</p>}

                {/* Live inventory count — pulled straight from the DB on every load, not cached. */}
                <p className="mt-4 text-sm text-ink/50">
                  {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
                </p>

                {product.stock > 0 && (
                  <>
                    <div className="mt-6 flex items-center gap-3">
                      <button
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-line hover:bg-line/40"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="w-8 text-center font-medium">{quantity}</span>
                      <button
                        onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-line hover:bg-line/40"
                      >
                        <Plus size={16} />
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        addToCart(product, quantity);
                        setAdded(true);
                        setTimeout(() => setAdded(false), 1500);
                      }}
                      className="mt-6 rounded-full bg-teal px-6 py-3 font-medium text-white transition-colors hover:bg-teal-deep"
                    >
                      {added ? "Added ✓" : "Add to cart"}
                    </button>

                    <button
                      onClick={() => {
                        addToCart(product, quantity);
                        router.push("/cart");
                      }}
                      className="mt-2 text-sm font-medium text-teal underline underline-offset-4"
                    >
                      Buy now
                    </button>
                  </>
                )}

                <div className="mt-6">
                  <ShippingEstimator subtotal={product.price * quantity} />
                </div>
              </div>
            </div>

            <ReviewsSection productId={product.id} />
            <QnASection productId={product.id} />
          </div>
        )}
      </main>
    </>
  );
}
