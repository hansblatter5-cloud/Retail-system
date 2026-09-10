ck# Daniel's Retail Management Platform

Full-stack e-commerce + business management system: public storefront, role-based
admin dashboard, in-store POS, and unified inventory — built per the project
proposal (KES currency, Owner/Manager/Staff roles, public staff signup with
admin approval).

## Stack

- **Backend:** Express + TypeScript + Prisma + PostgreSQL
- **Frontend:** Next.js (App Router) + Tailwind CSS
- **Auth:** JWT, role-based (OWNER / MANAGER / STAFF)

## Project structure

```
daniel-retail/
  backend/     Express API, Prisma schema, all business logic
  frontend/    Next.js storefront + admin dashboard
```

---

## 1. Backend setup

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env`:
- `DATABASE_URL` — your PostgreSQL connection string
- `JWT_SECRET` — any long random string (e.g. generate with `openssl rand -hex 32`)
- `CORS_ORIGIN` — `http://localhost:3000` for local dev

Then generate the Prisma client and run the first migration:

```bash
npx prisma generate
npx prisma migrate dev --name init
```

**Create the first Owner account** (there's no admin yet to approve anyone,
so this seed script creates Daniel's Owner login directly):

```bash
SEED_OWNER_EMAIL=daniel@example.com SEED_OWNER_PASSWORD='SomeStrongPassword123' npm run seed
```

Both variables are required — the script refuses to run with a default or
missing password. Use a real, strong password here; there's no "change
password" endpoint built yet (see `SECURITY.md`), so whatever you set here
is what you'll log in with initially.

Run the dev server:

```bash
npm run dev
```

API runs on `http://localhost:5000` by default. Health check: `GET /health`.

---

## 2. Frontend setup

```bash
cd frontend
npm install
cp .env.local.example .env.local
```

Edit `.env.local` if your backend isn't on the default port:
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

Run the dev server:

```bash
npm run dev
```

Frontend runs on `http://localhost:3000`.

- Storefront: `/`
- Staff login: `/login`
- Staff signup (pending approval): `/signup`
- Dashboard (after login): `/dashboard`

---

## 3. How the roles work

- **Owner** — full access: approve/reject staff, assign any role, all dashboard sections.
- **Manager** — approve staff as Staff only, manage products/orders/customers/POS, cannot change roles.
- **Staff** — POS, view orders/inventory/customers, cannot approve signups or manage products' core settings beyond stock.

New staff sign up at `/signup`. Their account sits as `PENDING` until Daniel or
a Manager approves them from **Dashboard → Staff**. Rejected or not-yet-approved
accounts cannot log in.

---

## 4. How stock stays unified

Every sale — whether placed by a customer on the storefront (`ONLINE`) or
logged by staff at the counter (`ONLINE POS` screen, `IN_STORE`) — goes through
the same `POST /api/orders` endpoint and the same database transaction. Stock is
decremented once, in one place, regardless of channel. Cancelling an order
restores the stock automatically. This is what keeps online and physical
inventory in sync without needing to reconcile two systems.

---

## 5. Deployment (same pattern as your other projects)

- **Backend → Render:** new Web Service, root directory `backend`, build command
  `npm install && npx prisma generate && npm run build`, start command `npm start`.
  Add a Render PostgreSQL instance and set `DATABASE_URL` to its connection string.
  Set `JWT_SECRET` and `CORS_ORIGIN` (your Vercel frontend URL) as environment variables.
  After first deploy, run `npx prisma migrate deploy` and `npm run seed` from Render's shell.

- **Frontend → Vercel:** import the `frontend` folder as the project root, set
  `NEXT_PUBLIC_API_URL` to your Render backend URL + `/api`.

---

## 6. Security

See `SECURITY.md` for the full rundown — what's enforced (rate limiting,
audit logging, role checks, password policy, CORS lockdown), what's a
deliberate tradeoff, and what you need to handle operationally (real JWT
secret, HTTPS, database backups) before this goes live with real customers.

## 7. What's included

- Public storefront: catalog, search, category filter, product detail, cart, checkout
- Staff signup with admin approval flow
- Password reset via email (with a console-log fallback if no email provider
  is configured yet — see below) and in-app change-password for logged-in staff
- Order notification emails: customer gets a confirmation (if they gave an
  email), and every Owner/Manager gets a "new order" alert as sales happen —
  plus status-update emails (shipped/delivered/cancelled)
- Optional WhatsApp deep link on the order confirmation page, same pattern as
  your Undie Bar site (`wa.me` link, no Business API setup required)
- Product photo upload straight from the dashboard (Cloudinary), with a
  manual URL field as a fallback if you don't want to set that up yet
- Role-based dashboard: Overview (analytics + revenue chart), Orders, Inventory,
  Customers, Staff approval, POS, Settings
- Unified stock ledger across online + in-store sales, with stock movement history
- Order cancellation with automatic stock restoration
- Low-stock alerts
- Audit log for staff approvals, role changes, product deactivation, order
  cancellations, and password changes/resets

### Setting up password reset & order emails

Both use the same email pipeline. Without `RESEND_API_KEY` set, emails are
printed to the backend's console instead of sent — good enough to test the
flow locally. For real emails in production:

1. Create a free account at [resend.com](https://resend.com) and get an API key.
2. Set `RESEND_API_KEY` and `EMAIL_FROM` in the backend's environment variables.
3. Set `FRONTEND_URL` to your deployed frontend URL so reset links point to the right place.

### Setting up product image upload

1. Create a free account at [cloudinary.com](https://cloudinary.com).
2. From your Cloudinary dashboard, grab the Cloud Name, API Key, and API Secret.
3. Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
   in the backend's environment variables.

Without these set, the "Upload a photo" button in the dashboard returns a
clear error telling you it's not configured yet — the manual image URL field
still works either way, so this isn't a blocker to launching.

### Setting up the WhatsApp link (optional)

Set `NEXT_PUBLIC_WHATSAPP_NUMBER` in the frontend's environment variables to
Daniel's business WhatsApp number in international format, no `+` or spaces
(e.g. `255712345678`). Leave it unset to hide the link entirely.

## 8. Visual design

The whole system shares one design language rather than looking like default
Tailwind components stitched together:

- **Custom logo mark** (`LogoMark.tsx`) — an abstract woven-basket monogram in
  the brand palette, used in the navbar, dashboard sidebar, receipts, and favicon.
- **Ledger numerals** — every price, quantity, stock count, and order number
  renders in IBM Plex Mono with tabular figures (the `.font-ledger` class).
  This is deliberate: the app is fundamentally a ledger, and numbers that
  align and hold their width read as built for bookkeeping, not a marketing
  template. Prose stays in Inter/Sora; only figures get the mono treatment.
- **Elevation system** — warm-tinted shadow tokens (`shadow-elev-sm/md/lg` in
  `globals.css`) instead of default gray Tailwind shadows, so cards feel like
  part of this palette.
- **Skeleton loading states** (`Skeleton.tsx`) — replace bare "Loading..."
  text throughout the storefront and dashboard with layout-shaped placeholders.
- **Consistent empty states** (`EmptyState.tsx`) — icon + message + optional
  action, used everywhere a list can be empty (cart, orders, inventory,
  customers, storefront search).
- **Printable receipts** (`ReceiptModal.tsx`) — a proper receipt layout for
  both online orders and POS sales, with its own print stylesheet so hitting
  Print produces a clean slip, not a screenshot of the dashboard chrome.

## 9. What's not included yet (worth building next)

- Full WhatsApp Business API integration (the current link is a simple
  `wa.me` deep link — a real Business API integration would let you send
  automated order-status messages instead of relying on customers tapping a
  link, but requires Meta business verification)
- Receipt printing for POS sales
- Multi-branch support (schema is single-location for now)

## 10. A note on this build

This was scaffolded and written directly in the sandbox without live database
access, so `prisma generate` / `migrate` haven't been run yet on this end —
you'll do that as the first step locally (steps above), same as the Windows
Prisma setup you already worked through on the school finance system. The
backend and frontend both pass a full TypeScript and ESLint check with zero
errors.
