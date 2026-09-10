const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

interface RequestOptions extends RequestInit {
  token?: string | null;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { token, headers, ...rest } = options;

  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message = typeof data.error === "string" ? data.error : "Something went wrong. Please try again.";
    throw new Error(message);
  }

  return data as T;
}

export const api = {
  get: <T>(path: string, token?: string | null) => request<T>(path, { method: "GET", token }),
  post: <T>(path: string, body: unknown, token?: string | null) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body), token }),
  put: <T>(path: string, body: unknown, token?: string | null) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body), token }),
  patch: <T>(path: string, body: unknown, token?: string | null) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body), token }),
  delete: <T>(path: string, token?: string | null) => request<T>(path, { method: "DELETE", token }),
  // For multipart uploads (review photo/video attachments). Skips the
  // Content-Type header the plain request() helper sets, so the browser can
  // fill in the correct multipart boundary itself.
  postForm: async <T>(path: string, form: FormData, token?: string | null): Promise<T> => {
    const res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: form,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(typeof data.error === "string" ? data.error : "Something went wrong. Please try again.");
    }
    return data as T;
  },
};

// --- Shared types mirrored from the backend Prisma schema ---

export type Role = "OWNER" | "MANAGER" | "STAFF";
export type AccountStatus = "PENDING" | "APPROVED" | "REJECTED";
export type OrderStatus = "PENDING" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED";
export type OrderChannel = "ONLINE" | "IN_STORE";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  status?: AccountStatus;
}

export interface Category {
  id: string;
  name: string;
}

export interface ProductImage {
  id: string;
  url: string;
  sortOrder: number;
}

export interface Product {
  id: string;
  name: string;
  description?: string | null;
  sku: string;
  price: number;
  stock: number;
  lowStockThreshold: number;
  imageUrl?: string | null;
  images: ProductImage[];
  avgRating: number | null;
  reviewCount: number;
  isActive: boolean;
  categoryId?: string | null;
  category?: Category | null;
}

export interface Customer {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  createdAt: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  product: Product;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  channel: OrderChannel;
  status: OrderStatus;
  totalAmount: number;
  notes?: string | null;
  customer?: Customer | null;
  items: OrderItem[];
  createdAt: string;
}

export function formatKES(amount: number): string {
  return new Intl.NumberFormat("en-KE", { maximumFractionDigits: 0, useGrouping: true }).format(amount) + " KSh";
}

export function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Something went wrong. Please try again.";
}

// --- Reviews, Q&A, storefront settings, shipping (mirrors backend additions) ---

export interface Review {
  id: string;
  authorName: string;
  rating: number;
  title: string | null;
  comment: string;
  photoUrls: string[];
  videoUrls: string[];
  verifiedPurchase: boolean;
  createdAt: string;
}

export interface ReviewsResponse {
  reviews: Review[];
  page: number;
  pageSize: number;
  total: number;
  avgRating: number | null;
}

export interface ProductQuestion {
  id: string;
  authorName: string;
  question: string;
  answer: string;
  answeredAt: string;
}

export interface StoreSettings {
  ownerName: string;
  contactEmail: string;
  whatsappNumber: string;
  whatsappUrl: string | null;
  socialHandle: string;
  facebookUrl: string | null;
  instagramUrl: string | null;
  xUrl: string | null;
  tiktokUrl: string | null;
  locationName: string;
  returnPolicy: string;
}

export interface ShippingZone {
  id: string;
  name: string;
}

export interface ShippingEstimate {
  zone: string;
  shippingCost: number;
  freeShippingApplied: boolean;
  estDeliveryDaysMin: number;
  estDeliveryDaysMax: number;
}

export const authApi = {
  forgotPassword: (email: string) => api.post<{ message: string }>("/auth/forgot-password", { email }),
  resetPassword: (token: string, newPassword: string) =>
    api.post<{ message: string }>("/auth/reset-password", { token, newPassword }),
  changePassword: (currentPassword: string, newPassword: string, token: string | null) =>
    api.post<{ message: string }>("/auth/change-password", { currentPassword, newPassword }, token),
};

export async function uploadProductImage(file: File, token: string | null): Promise<string> {
  const formData = new FormData();
  formData.append("image", file);

  const res = await fetch(`${API_URL}/uploads/product-image`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "Image upload failed");
  }
  return data.url as string;
}

// Gallery upload — up to 8 files in one request, used by the product form's
// multi-image picker. Returns URLs in the same order the files were sent.
export async function uploadProductImages(files: File[], token: string | null): Promise<string[]> {
  const formData = new FormData();
  files.forEach((file) => formData.append("images", file));

  const res = await fetch(`${API_URL}/uploads/product-images`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "Image upload failed");
  }
  return data.urls as string[];
}

// Public — no token. Used by the review/Q&A photo & video attach control.
export async function uploadReviewAttachment(file: File): Promise<{ url: string; type: "image" | "video" }> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_URL}/uploads/review-attachment`, { method: "POST", body: formData });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "Upload failed");
  }
  return data as { url: string; type: "image" | "video" };
}
