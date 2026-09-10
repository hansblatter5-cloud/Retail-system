"use client";

import { useEffect, useState } from "react";
import { api, Product, Category, getErrorMessage } from "@/lib/api";
import { Navbar } from "@/components/Navbar";
import { ProductCard } from "@/components/ProductCard";
import { SkeletonProductCard } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { Search, PackageSearch } from "lucide-react";

export default function StorefrontHome() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Category[]>("/categories").then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (activeCategory) params.set("category", activeCategory);

    api
      .get<Product[]>(`/products?${params.toString()}`)
      .then(setProducts)
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [search, activeCategory]);

  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <section className="weave-texture relative mb-10 overflow-hidden rounded-3xl bg-teal px-8 py-14 text-white shadow-elev-lg">
          <p className="mb-2 text-sm uppercase tracking-widest text-gold-light">Welcome</p>
          <h1 className="font-display max-w-xl text-3xl font-bold leading-tight sm:text-4xl">
            Quality goods, straightforward prices, one shop.
          </h1>
          <p className="mt-3 max-w-lg text-white/80">
            Browse the full catalog below. Every order is fulfilled from real stock on hand.
          </p>
        </section>

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" size={16} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="w-full rounded-full border border-line bg-white py-2.5 pl-9 pr-4 text-sm outline-none focus:border-teal"
            />
          </div>

          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveCategory(null)}
                className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
                  !activeCategory ? "bg-ink text-white" : "bg-white text-ink/70 border border-line"
                }`}
              >
                All
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveCategory(c.id)}
                  className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
                    activeCategory === c.id ? "bg-ink text-white" : "bg-white text-ink/70 border border-line"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {error && <p className="rounded-xl bg-danger/10 p-4 text-sm text-danger">{error}</p>}

        {loading ? (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonProductCard key={i} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <EmptyState
            icon={PackageSearch}
            title="No products found"
            description={search || activeCategory ? "Try a different search or category." : "Check back soon."}
          />
        ) : (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
