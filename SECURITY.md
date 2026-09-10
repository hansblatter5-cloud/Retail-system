# Security Overview

What's enforced in the code, what's a deliberate tradeoff, and what's on
Daniel/you to handle operationally when you deploy this.

## Authentication & authorization

- Passwords are hashed with bcrypt (cost factor 12) — never stored in plain text.
- Passwords must be at least 8 characters with a letter and a number.
- JWTs are signed with a secret validated at server startup — the app **refuses
  to boot** if `JWT_SECRET` is missing, too short (<32 chars), or looks like a
  placeholder value.
- Every authenticated request re-checks the user's status in the database
  (not just the token's signature). If an account is rejected or deactivated
  after a token was issued, access is cut immediately rather than waiting for
  the 7-day token to expire.
- Role checks (`OWNER` / `MANAGER` / `STAFF`) are enforced server-side on
  every protected route — the frontend hiding a button is a UX nicety, not
  the actual security boundary.
- Privilege escalation guards:
  - A Manager cannot approve a signup as Owner or Manager — only Owner can.
  - An Owner cannot change their own role through the staff-management
    endpoint (prevents accidentally locking the account out of Owner access).
  - A pending account can only be approved/rejected once — replaying the
    decision endpoint against an already-decided account is blocked.

## Rate limiting

- Login: 10 attempts per 15 minutes per IP — slows down credential brute-forcing.
- Signup: 5 attempts per hour per IP — stops the staff-approval queue from being spammed.
- Public storefront checkout: 20 orders per 10 minutes per IP — limits fake-order
  abuse without throttling legitimate staff POS use (staff requests are exempt).
- A general baseline limit (300 requests / 15 min) applies API-wide as a backstop.

## Input validation

- Every request body is validated with Zod schemas — nothing reaches the
  database unvalidated. Numeric fields (price, stock, quantity) have sane
  upper bounds to prevent overflow-style abuse.
- Order line items are capped at 200 per order to prevent oversized transaction payloads.
- Emails are normalized to lowercase before lookup/storage, so `Daniel@x.com`
  and `daniel@x.com` can't become two different accounts.

## Data access

- All database queries go through Prisma, which uses parameterized queries —
  this rules out classic SQL injection by construction (you'd have to go out
  of your way with raw SQL to reintroduce that risk).
- Deletions are soft (products get deactivated, not removed) — order history
  stays intact and nothing can be used to cover tracks by actually deleting rows.

## File upload (product images)

- Restricted to Owner/Manager — Staff cannot upload images.
- File type is checked against an allowlist (JPEG/PNG/WEBP/GIF only) before
  it's accepted.
- Capped at 5MB and one file per request.
- Files are streamed directly to Cloudinary in memory — never written to the
  server's disk, so there's no local file storage to secure, clean up, or
  accidentally serve directly.
- The upload endpoint requires a valid Owner/Manager token — it's not a
  public endpoint, so it can't be used as an anonymous file-hosting service.

## Audit trail

- An `AuditLog` table records who did what for the actions that matter most:
  staff approvals/rejections, role changes, product deactivation, and order
  cancellations.
- A separate `StockMovement` ledger records every single stock change (sale,
  restock, adjustment, return) with who triggered it — this is what makes
  the "unified inventory" claim actually auditable, not just convenient.

## Transport & headers

- `helmet()` sets standard security headers on every API response (HSTS in
  production, X-Content-Type-Options, etc.).
- The frontend sets its own headers (`X-Frame-Options: DENY`,
  `X-Content-Type-Options: nosniff`, a restrictive `Permissions-Policy`) via
  `next.config.ts`.
- CORS is locked to a single explicit origin. In production, the app refuses
  to boot if `CORS_ORIGIN` is unset or `*` — wildcard CORS is not allowed once
  `NODE_ENV=production`.
- **You must deploy behind HTTPS.** Both Vercel and Render provide this by
  default — don't disable it, and don't proxy through anything that terminates
  TLS and re-serves over plain HTTP.

## Known tradeoffs (and why)

- **JWT stored in `localStorage`, not an httpOnly cookie.** This is simpler to
  build and matches how you'd typically deploy frontend and backend on
  different domains (Vercel + Render), but it does mean a successful XSS
  attack could steal the token. The mitigation is keeping XSS surface low —
  React escapes rendered content by default, and this codebase doesn't use
  `dangerouslySetInnerHTML` anywhere. If you later accept user-generated HTML
  (e.g. rich product descriptions), that's the point where you'd want to
  revisit this and add sanitization or move to httpOnly cookies.
- **No password reset flow yet.** If a staff member forgets their password,
  it has to be reset directly in the database for now. Worth building an
  email-based reset flow before this goes to a real team beyond Daniel.
- **No 2FA.** Reasonable for a small team at launch; worth adding if the
  Owner/Manager accounts become higher-value targets (e.g. if payment
  processing gets added later).

## Password reset

- Reset links use a 256-bit random token — only its SHA-256 hash is ever
  stored, the same way passwords themselves are never stored in plain text.
- Links expire after 1 hour and can only be used once; using one invalidates
  any other outstanding reset requests for that account.
- The "forgot password" endpoint always returns the same generic response
  whether or not the email exists, and is rate-limited (5/hour/IP) — this
  prevents it being used to enumerate registered emails or to spam someone's
  inbox with reset requests.
- Without an email provider configured, reset links are printed to the
  server console instead of sent — safe for local development, but you must
  set `RESEND_API_KEY` before this goes live so real users actually receive
  their reset emails (see the main README for setup).

## What you're responsible for operationally

1. **Generate a real `JWT_SECRET`** — `openssl rand -hex 32` — and never commit
   it. `.env` is already gitignored in this project; keep it that way.
2. **Set `SEED_OWNER_PASSWORD` to something strong** when running the seed
   script — there's no shipped default password anymore, by design.
3. **Set `CORS_ORIGIN` to your exact Vercel URL** in production, not a wildcard.
4. **Rotate `JWT_SECRET`** if it's ever exposed (this invalidates all
   existing sessions — everyone has to log in again, which is the point).
5. **Back up the PostgreSQL database regularly** — Render's managed Postgres
   has automated backups; make sure they're enabled.
6. **Review the audit log periodically**, especially staff approvals and role
   changes, since Daniel is trusting other people with real access to his
   business data.
