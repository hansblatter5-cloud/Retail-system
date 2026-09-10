# Frontend changes — v2 setup notes

This **replaces** the components from the first frontend zip — they now use
real types from your actual `lib/api.ts` instead of guessed local copies.

## What's in this zip
```
frontend-changes/
└── src/
    ├── lib/api.ts                         → replace (adds postForm, uploadProductImages,
    │                                         uploadReviewAttachment, Product.images/avgRating/
    │                                         reviewCount, Review/ProductQuestion/StoreSettings/
    │                                         ShippingZone/ShippingEstimate types)
    ├── app/
    │   ├── layout.tsx                     → replace (adds StoreInfoSidebar site-wide)
    │   ├── checkout/page.tsx              → replace (adds delivery zone picker; see note below)
    │   └── products/[id]/page.tsx         → replace (gallery, rating, reviews, Q&A, shipping)
    └── components/
        ├── StoreInfoSidebar.tsx           → owner/contact/social/location drawer
        ├── ProductGallery.tsx             → multi-image gallery, falls back to imageUrl
        ├── StarRating.tsx                 → read-only + interactive
        ├── ReviewsSection.tsx             → list + submit, photo/video attach
        ├── QnASection.tsx                 → list answered + ask
        └── ShippingEstimator.tsx          → zone picker + live cost/delivery estimate
```

## TSH — resolved
Checked every price-displaying file across the whole app now (home, layout,
product detail, cart, checkout, `api.ts`): **all use `formatKES()` → "KSh"**.
There is no TSH anywhere in what you've sent. If you're still seeing it
somewhere, it's most likely in the **admin product create/edit form**, which
I still don't have — send it and I'll check.

## Important: checkout shipping is informational only, not charged yet
`ShippingEstimator` is wired into checkout and shows the delivery zone +
cost, but your backend `Order` model has no `shippingCost` field — I didn't
want to guess at changing your order totals/schema without confirming. So
right now:
- The customer sees the estimate and picks a zone
- The chosen zone + cost gets appended to the order's `notes` field so staff
  see it when fulfilling
- **`totalAmount` still reflects items only** — shipping isn't added to what
  the customer is charged automatically

If you want shipping actually added to the charged total, say so and I'll
add a `shippingCost`/`shippingZoneId` field to the `Order` model on the
backend and thread it through order creation + the checkout total display.

## Still needed
1. **The actual admin/staff product create/edit form** (not `staff.zip` —
   that was the team/role-approval page). This is where I need to wire
   the multi-image upload UI (`uploadProductImages` is already in `api.ts`,
   ready to call) and where TSH is most likely hiding.
2. **`Navbar.tsx`** — optional, for a staff badge on unmoderated
   reviews/questions.
3. Confirmation on the shipping-charged-to-total question above.
