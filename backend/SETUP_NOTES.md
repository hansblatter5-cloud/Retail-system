# Backend changes — setup notes

## What's in this zip
Drop these files into your `backend/` folder, overwriting the matching paths:

```
backend-changes/
├── prisma/
│   ├── schema.prisma      → replace backend/prisma/schema.prisma
│   └── seed.ts            → replace backend/prisma/seed.ts
└── src/
    ├── index.ts                        → replace backend/src/index.ts
    ├── controllers/
    │   ├── productController.ts        → replace (updated)
    │   ├── uploadController.ts         → replace (updated)
    │   ├── reviewController.ts         → new
    │   ├── qnaController.ts            → new
    │   ├── settingsController.ts       → new
    │   └── shippingController.ts       → new
    ├── routes/
    │   ├── uploadRoutes.ts             → replace (updated)
    │   ├── reviewRoutes.ts             → new
    │   ├── qnaRoutes.ts                → new
    │   ├── settingsRoutes.ts           → new
    │   └── shippingRoutes.ts           → new
    ├── lib/cloudinary.ts               → replace (updated)
    └── middleware/rateLimiters.ts      → replace (updated)
```

## Steps

1. **Copy the files in** (back up first / do this on a branch).
2. **Generate & run the migration:**
   ```bash
   cd backend
   npx prisma migrate dev --name add_reviews_qna_settings_shipping_images
   ```
   This creates: `product_images`, `reviews`, `product_questions`, `store_settings`, `shipping_zones` tables, and backfills nothing automatically — existing products keep their single `imageUrl` until you add more images via the updated product form.
3. **Re-run the seed** to populate your real contact/social/location info and default shipping zones:
   ```bash
   SEED_OWNER_EMAIL=<existing owner email> SEED_OWNER_PASSWORD=<placeholder, ignored if owner exists> npm run seed
   ```
   (The owner-account part of the seed skips if the account already exists — only the new `StoreSettings` + `ShippingZone` rows will be created.)
4. **Check `.env`** — no new required env vars. Optional: nothing changes for `CLOUDINARY_*`, they're reused for review photo/video uploads too.

## Things I seeded with placeholder values — edit before going live
- **Return policy text** in `StoreSettings.returnPolicy` — I wrote a generic 7-day policy since you hadn't given me your actual terms. Update via `PUT /api/settings` (OWNER-only) or directly in the DB.
- **Shipping zone rates/timelines** in `ShippingZone` — I seeded 3 zones (Nairobi CBD / Nairobi Metro / Rest of Kenya) with placeholder rates (KSh 200/350/600) and free-shipping thresholds. Adjust to your real courier pricing via the shipping zone admin endpoints.

## New API surface (for the frontend build)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/products` / `/api/products/:id` | Public | Now includes `images[]`, `avgRating`, `reviewCount` |
| POST | `/api/uploads/product-images` | Staff | Multi-file upload (up to 8), returns `{ urls: [] }` |
| POST | `/api/uploads/review-attachment` | Public (rate-limited) | Single photo/video for a review, returns `{ url, type }` |
| GET | `/api/reviews/product/:productId` | Public | Paginated approved reviews + avg rating |
| POST | `/api/reviews` | Public (rate-limited) | Submit a review (pending until approved) |
| GET | `/api/reviews/pending` / PATCH `/api/reviews/:id/moderate` | Staff | Moderation queue |
| GET | `/api/questions/product/:productId` | Public | Answered Q&A only |
| POST | `/api/questions` | Public (rate-limited) | Ask a question |
| GET | `/api/questions/unanswered` / PATCH `/api/questions/:id/answer` | Staff | Answer queue |
| GET | `/api/settings` | Public | Owner name, email, WhatsApp, social links, location, return policy |
| PUT | `/api/settings` | OWNER only | Edit the above |
| GET | `/api/shipping-zones` | Public | Active zones for a delivery-estimate list |
| GET | `/api/shipping-zones/calculate?zoneId=&subtotal=` | Public | Shipping cost + delivery window for the calculator |
| GET/POST/PUT/DELETE | `/api/shipping-zones/...` | Staff | Manage zones/rates |

## What I could NOT do from the backend alone
- **Currency TSH → Ksh**: the backend already stores and formats everything in KSh (`formatKES()`, schema comment). If "TSH" is showing anywhere, it's a **frontend** display bug — send me the frontend product/price display components and I'll fix it there.
- **The actual sidebar UI, image gallery uploader UI, star-rating widget, review form, Q&A widget, and shipping calculator UI** — all frontend work, not started yet. Send the frontend files listed earlier and I'll build these next.
