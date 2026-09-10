"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api, Product, Category, formatKES, getErrorMessage, uploadProductImage } from "@/lib/api";
import { Plus, AlertTriangle, X, Upload, Loader2, Package } from "lucide-react";
import { SkeletonRow } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";

export default function InventoryPage() {
  const { token, user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  const canManage = user?.role === "OWNER" || user?.role === "MANAGER";

  function load() {
    if (!token) return;
    setLoading(true);
    Promise.all([api.get<Product[]>("/products", token), api.get<Category[]>("/categories", token)])
      .then(([p, c]) => {
        setProducts(p);
        setCategories(c);
      })
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }

  useEffect(load, [token]);

  async function handleStockAdjust(productId: string, quantity: number) {
    if (!token) return;
    try {
      await api.post(`/products/${productId}/stock`, { quantity, reason: "ADJUSTMENT" }, token);
      load();
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display mb-1 text-2xl font-bold">Inventory</h1>
          <p className="text-sm text-ink/50">Manage products and stock levels.</p>
        </div>
        {canManage && (
          <button
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
            className="flex items-center gap-1.5 rounded-full bg-teal px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-deep"
          >
            <Plus size={16} />
            Add product
          </button>
        )}
      </div>

      {error && <p className="mb-4 rounded-xl bg-danger/10 p-3 text-sm text-danger">{error}</p>}

      <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-elev-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-ink/50">
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium">SKU</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium">Stock</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} columns={6} />)
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10">
                  <EmptyState icon={Package} title="No products yet" description="Add your first product to get started." />
                </td>
              </tr>
            ) : (
              products.map((p) => {
                const lowStock = p.stock <= p.lowStockThreshold;
                return (
                  <tr key={p.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3 font-medium">{p.name}</td>
                    <td className="font-ledger px-4 py-3 text-ink/50">{p.sku}</td>
                    <td className="px-4 py-3 text-ink/50">{p.category?.name || "—"}</td>
                    <td className="font-ledger px-4 py-3">{formatKES(p.price)}</td>
                    <td className="px-4 py-3">
                      <span className={`font-ledger flex items-center gap-1.5 ${lowStock ? "text-danger font-medium" : ""}`}>
                        {lowStock && <AlertTriangle size={14} />}
                        {p.stock}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {canManage && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleStockAdjust(p.id, 10)}
                            className="rounded-full border border-line px-2.5 py-1 text-xs hover:bg-line/40"
                          >
                            +10 stock
                          </button>
                          <button
                            onClick={() => {
                              setEditing(p);
                              setShowForm(true);
                            }}
                            className="rounded-full border border-line px-2.5 py-1 text-xs hover:bg-line/40"
                          >
                            Edit
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <ProductFormModal
          token={token}
          categories={categories}
          product={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function ProductFormModal({
  token,
  categories,
  product,
  onClose,
  onSaved,
}: {
  token: string | null;
  categories: Category[];
  product: Product | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(product?.name || "");
  const [sku, setSku] = useState(product?.sku || "");
  const [price, setPrice] = useState(String(product?.price || ""));
  const [stock, setStock] = useState(String(product?.stock ?? "0"));
  const [lowStockThreshold, setLowStockThreshold] = useState(String(product?.lowStockThreshold ?? "5"));
  const [description, setDescription] = useState(product?.description || "");
  const [categoryId, setCategoryId] = useState(product?.categoryId || "");
  const [imageUrl, setImageUrl] = useState(product?.imageUrl || "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const payload = {
      name,
      sku,
      price: Number(price),
      stock: Number(stock),
      lowStockThreshold: Number(lowStockThreshold),
      description: description || undefined,
      categoryId: categoryId || undefined,
      imageUrl: imageUrl || undefined,
    };
    try {
      if (product) {
        await api.put(`/products/${product.id}`, payload, token);
      } else {
        await api.post("/products", payload, token);
      }
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">{product ? "Edit product" : "Add product"}</h2>
          <button onClick={onClose} className="text-ink/40 hover:text-ink">
            <X size={20} />
          </button>
        </div>

        {error && <p className="mb-4 rounded-xl bg-danger/10 p-3 text-sm text-danger">{error}</p>}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            required
            placeholder="Product name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-xl border border-line px-4 py-2.5 text-sm outline-none focus:border-teal"
          />
          <input
            required
            placeholder="SKU"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            className="rounded-xl border border-line px-4 py-2.5 text-sm outline-none focus:border-teal"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              required
              type="number"
              placeholder="Price (KSh)"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="rounded-xl border border-line px-4 py-2.5 text-sm outline-none focus:border-teal"
            />
            <input
              required
              type="number"
              placeholder="Stock"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              className="rounded-xl border border-line px-4 py-2.5 text-sm outline-none focus:border-teal"
            />
          </div>
          <input
            type="number"
            placeholder="Low stock threshold"
            value={lowStockThreshold}
            onChange={(e) => setLowStockThreshold(e.target.value)}
            className="rounded-xl border border-line px-4 py-2.5 text-sm outline-none focus:border-teal"
          />
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="rounded-xl border border-line px-4 py-2.5 text-sm outline-none focus:border-teal"
          >
            <option value="">No category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-ink/70">Product image</label>
            {imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="Preview" className="h-24 w-24 rounded-xl border border-line object-cover" />
            )}
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-line px-4 py-3 text-sm text-ink/60 hover:border-teal hover:text-teal">
              {uploading ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Uploading...
                </>
              ) : (
                <>
                  <Upload size={16} /> Upload a photo
                </>
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                disabled={uploading}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setUploading(true);
                  setError(null);
                  try {
                    const url = await uploadProductImage(file, token);
                    setImageUrl(url);
                  } catch (err) {
                    setError(getErrorMessage(err));
                  } finally {
                    setUploading(false);
                  }
                }}
              />
            </label>
            <input
              placeholder="...or paste an image URL"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="rounded-xl border border-line px-4 py-2.5 text-sm outline-none focus:border-teal"
            />
          </div>
          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="rounded-xl border border-line px-4 py-2.5 text-sm outline-none focus:border-teal"
          />

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 rounded-full bg-teal py-3 text-sm font-medium text-white hover:bg-teal-deep disabled:opacity-50"
          >
            {submitting ? "Saving..." : product ? "Save changes" : "Add product"}
          </button>
        </form>
      </div>
    </div>
  );
}
