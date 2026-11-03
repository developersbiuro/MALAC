# MALAC — E-Commerce Platform

MALAC is a Daraz.pk-style e-commerce platform: a customer storefront
(homepage, flash sales, product pages, cart, multi-step checkout, orders)
and a full admin suite (analytics, product/category management, order
fulfillment, coupons, roles, settings).

> This repository is the standalone source code for MALAC. A hosted demo
> version also exists; this repo is the version you deploy yourself.

## Tech Stack

| Layer    | Technology |
|----------|------------|
| Frontend | Vite + React SPA, React Router, Tailwind CSS, lucide-react icons, axios |
| Backend  | Node.js + Express REST API (controller → service → model separation) |
| Database | MongoDB + Mongoose (indexes on SKU, product title/text, category) |
| Auth     | Passwordless OTP (email + WhatsApp/SMS), JWT, RBAC, Login with Google |
| Uploads  | multer (payment screenshots), stored under `server/uploads/` |

## Architecture

```
malac/
├── client/                  # Vite + React SPA
│   └── src/
│       ├── api/client.js    # axios instance (JWT interceptor)
│       ├── context/         # Auth, Cart, Wishlist providers
│       ├── components/      # Header (mega-menu + search), Footer, CartDrawer...
│       └── pages/           # Storefront pages + pages/admin/* (admin suite)
└── server/
    └── src/
        ├── config/          # env + MongoDB connection
        ├── models/          # User, Product, Category, Order, Coupon,
        │                    # Review, OtpToken, Settings
        ├── middleware/      # auth (JWT + RBAC), upload (multer), errors
        ├── services/        # otp, email, whatsapp, sms, google, order,
        │                    # coupon, analytics
        ├── controllers/     # thin HTTP layer
        ├── routes/          # /api/auth, /api/products, /api/categories,
        │                    # /api/orders, /api/coupons, /api/admin,
        │                    # /api/uploads, /api/settings
        └── seed/seed.js     # demo data + first Super Admin
```

## Quick Start

Prerequisites: Node.js 18+, a running MongoDB (local or Atlas).

```bash
# 1. Configure environment
cp .env.example .env        # then edit .env (at least MONGO_URI + JWT_SECRET)

# 2. Install dependencies
npm run install:all

# 3. Seed demo data (categories, 15 products, WELCOME10 coupon, the one owner Super Admin)
npm run seed

# 4. Run (two terminals, or use `npm run dev` to start both)
npm run dev:server          # API on http://localhost:5000
npm run dev:client          # Store on http://localhost:5173
```

## Environment Variables

See `.env.example` for the full list. Key groups:

- **Core:** `MONGO_URI`, `JWT_SECRET`, `PORT`, `CLIENT_URL`
- **Super Admin allowlist:** `SUPER_ADMIN_EMAIL` (default
  `developersbiuro@gmail.com`), `SUPER_ADMIN_PHONE` (default
  `+923236016684`) — the only identity that may hold the Super Admin
  role; see "Admin accounts & security" below
- **OTP sender identity** (public sender identities, not secrets):
  `OTP_SENDER_EMAIL` (default `developersbiuro@gmail.com`),
  `OTP_SENDER_PHONE` / `WHATSAPP_SENDER_NUMBER` (default `+923236016684`)
- **OTP providers** (all optional — see Demo Mode below):
  SMTP (`SMTP_HOST/PORT/USER/PASS`), WhatsApp Cloud API
  (`WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`),
  Twilio (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`)
- **Google:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- **Manual payments:** `JAZZCASH_ACCOUNT_TITLE`, `JAZZCASH_ACCOUNT_NUMBER`,
  `EASYPAISA_ACCOUNT_TITLE`, `EASYPAISA_ACCOUNT_NUMBER`

Never commit a real `.env` — it is gitignored. No secrets are stored in
this repository.

## Authentication

### Customers — sign-up requires BOTH OTPs
1. Customer enters name, email and phone, and chooses how to receive the
   phone code: **WhatsApp OTP** or **SMS OTP**.
2. An OTP is emailed to them (`POST /api/auth/signup/email-otp`) and must
   be verified (`POST /api/auth/signup/verify-email`).
3. An OTP is then sent to their phone on the chosen channel
   (`POST /api/auth/signup/phone-otp`) and verified
   (`POST /api/auth/signup/verify-phone`) — only then is the account
   created. Both `emailVerified` and `phoneVerified` are set.

Login is passwordless too (`/api/auth/login/otp` → `/api/auth/login/verify`,
via email, WhatsApp or SMS), and **Login with Google** is available on the
login and sign-up screens (`POST /api/auth/google`).

### Demo OTP mode
If provider credentials are not configured, OTP runs in **demo mode**:
codes are logged on the server (`[DEMO EMAIL]`, `[DEMO WHATSAPP]`,
`[DEMO SMS]`) and returned to the client as `demoCode`, which the UI shows
in a clearly-marked demo box. This lets you test every flow end-to-end.
Set the SMTP / WhatsApp Cloud API / Twilio variables to send real codes;
set `OTP_DEMO_MODE=false` in production.

### Login with Google — real credentials
With `GOOGLE_CLIENT_ID` set, the server verifies Google ID tokens with
`google-auth-library`. Without it, Google sign-in runs in a clearly
labelled demo mode (the client sends a typed profile instead of a token).
To go live: create an OAuth client in Google Cloud Console, set
`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`, and wire Google Identity
Services on the client to obtain the `credential` token (see
`server/src/services/googleAuthService.js` and `client/src/pages/Login.jsx`).

### Admin accounts & security — no public admin creation

**Nobody can register as an admin.** There is no "Create Admin Account"
screen, tab or API anywhere:

- Public sign-up **always** creates a `customer`. Any `role` sent in a
  sign-up request is ignored by the server. The **single exception** is
  the `SUPER_ADMIN_EMAIL` allowlist (env var, default
  `developersbiuro@gmail.com`): if a sign-up verifies **both** OTPs with
  exactly that email, that account is the owner and carries role `admin`.
  Every other route to a staff role goes through the Super Admin, inside
  the panel.
- The seed creates **exactly one staff account**: the store owner
  (`SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PHONE`) as Super Admin. It has **no
  password** (`accountStatus: "pending_setup"`, empty `passwordHash`) —
  there is no known or shared credential to leak. No demo staff accounts
  (`admin@malac.pk`, `vice@malac.pk`) exist anymore.
- **Vice-Admins are created by the Super Admin only**, in
  **Admin → Roles & Users → Create a Vice-Admin** (`POST /api/admin/users`,
  Super-Admin-only route). The account starts as `pending_setup`; a
  one-time setup link is emailed to the new Vice-Admin so **they** choose
  their own password — the Super Admin never sets or sees it (in demo
  mode the link is shown to the Super Admin to hand over personally).
  Vice-Admin access is the standard vice-admin set: products and orders —
  explicitly **not** coupons, settings, roles or payment verification.
- Role changes are hardened (`PATCH /api/admin/users/:id/role`,
  Super Admin only): the owner account's role is locked, and **nobody can
  be promoted to `admin`** — there is exactly one Super Admin.

### Admin login — dedicated, at `/admin`
The admin suite has its **own login screen**, separate from customer login:

1. Seed the database (`npm run seed`) — see above for the single seeded
   Super Admin it creates.
2. Visit **`http://localhost:5173/admin`**. If you are not signed in as
   staff, the Admin Login screen appears at that URL.
3. Sign in either way:
   - **OTP:** enter the staff email (or phone), choose Email / WhatsApp /
     SMS, and enter the code (demo mode shows it on screen), or
   - **Password:** staff email/phone + the password set through the
     forgot-password flow below (`POST /api/auth/login/password`,
     staff accounts only; customers are refused).
4. Only users with role `admin` (Super Admin) or `vice-admin` can enter.
   A customer account is rejected on this screen and signed out. Every
   `/admin/*` page is guarded the same way, and the server enforces RBAC
   on every `/api/admin/*` route. Google sign-in is customers-only: a
   Google identity matching a staff email is refused.

**First-time owner password setup:** on the Admin Login screen use
**Forgot password** with the owner email — as the Super Admin you verify
with an email OTP sent to `SUPER_ADMIN_EMAIL` and set your password right
there (step 2 under "Forgot password" below). Until then you can always
sign in with OTP.

### Forgot password — Super Admin approval required (staff)

Passwords exist only for staff accounts. The reset flow is approval-gated
end to end (`PasswordResetRequest` model: `user`, `email`, `status`,
`approvedBy`, hashed token, 1-hour expiry):

1. On the Admin Login screen, **Forgot password** → staff member submits
   their email (`POST /api/auth/password-reset/request`). For a Vice-Admin
   this only creates a request with status **`pending`** — *nothing* about
   their password can change yet.
2. The request appears in **Admin → Roles & Users → Password Reset
   Requests**. Only the **Super Admin** can **Approve** or **Reject** it
   (`PATCH /api/admin/password-resets/:id/approve|reject`).
3. **Only on approval** does the server generate a one-time reset token
   (SHA-256 hashed at rest, 1-hour expiry) and email the link
   (`/reset-password?token=…`) via the existing email service. In demo
   mode (no SMTP) the link is shown to the Super Admin in the panel to
   hand over personally, mirroring the OTP demo pattern.
4. The staff member opens the link and sets a new password
   (`POST /api/auth/password-reset/complete`); the token is then marked
   `used` and cleared. **Unapproved, rejected, expired or reused requests
   can never change a password.**

**Super Admin exception:** the owner cannot wait for his own approval —
his request is auto-approved and he proves ownership with a **verified
email OTP sent to `SUPER_ADMIN_EMAIL`**, then sets the new password in
the same screen (`POST /api/auth/password-reset/owner/verify`). This is
also how the seeded owner sets his very first password.
Customers are not part of this flow: they have no password (OTP / Google
login only), so there is nothing for them to reset.

### Roles (RBAC)
| Capability | Super Admin (`admin`) | Vice-Admin (`vice-admin`) | Customer |
|---|:-:|:-:|:-:|
| Products CRUD / archive | ✓ | ✓ | — |
| Categories | ✓ | ✓ (delete: Super only) | — |
| Order status updates | ✓ | ✓ | own orders only |
| Payment verification (JazzCash/Easypaisa) | ✓ | — | — |
| Coupons | ✓ | — | — |
| Settings & OTP/payment accounts | ✓ | — | — |
| Role assignment | ✓ | — | — |
| Create staff (Vice-Admin) accounts | ✓ | — | — |
| Approve staff password resets | ✓ | — | — |

## Ordering — No Guest Ordering (Daraz-style)

- Browsing, search, wishlist and adding to cart work **without** an
  account, exactly like Daraz.pk.
- **Placing an order requires a logged-in customer.** The checkout page
  and **Buy Now** redirect unauthenticated visitors to
  `/login?redirect=/checkout`; after login (or sign-up) they are returned
  to checkout automatically.
- This is not just UI: `POST /api/orders` and all order routes sit behind
  the JWT `protect` middleware on the server and return **401** for
  unauthenticated requests.
- Customers can cancel their own orders only while the status is
  `Pending` or `Processing` (`PATCH /api/orders/:orderId/cancel`).

## Payments

At checkout the customer can choose:

1. **Cash on Delivery (COD)** — default. Order is `Unpaid` until delivered.
2. **Card (simulation)** — demo only; no gateway is charged and no card
   data is stored.
3. **JazzCash — manual transfer** (see below)
4. **Easypaisa — manual transfer** (see below)

### JazzCash / Easypaisa manual payment with screenshot verification

The store currently uses **one shared account for both wallets**:

- **Account Title:** Muhammad Abdullah
- **Account Number:** +92 303 6253428

These are the configured **defaults** (`JAZZCASH_*` and `EASYPAISA_*` in
`.env.example`, seeded into Settings). They remain fully configurable:
change them in **Admin → Settings** or in `.env` and re-seed — nothing is
hard-coded in UI logic. (This payment number is intentionally different
from the OTP sender number.)

Flow:

1. Customer browses → logs in / signs up → adds to cart → checkout.
2. Customer picks **JazzCash** or **Easypaisa**. The checkout shows the
   store account title + number (fetched from `GET /api/settings/public`,
   which only exposes the safe payment subset).
3. Customer transfers the order total to that account in their wallet app.
4. Customer uploads the **payment screenshot**
   (`POST /api/uploads/payment-screenshot`, multer, images up to 5 MB,
   stored in `server/uploads/payment-screenshots/` — gitignored) and
   enters **transaction ID**, **sender account number** and **sender
   account title**, then places the order. The server requires all of
   these for wallet payments.
5. The order is saved with `paymentMethod: "JazzCash" | "Easypaisa"`,
   `paymentScreenshot`, `transactionId`, `senderAccount`, `senderTitle`,
   and `paymentVerificationStatus: "pending_verification"`.
6. In **Admin → Orders**, opening the order shows the screenshot and
   transaction details. A **Super Admin** can **Verify Payment**
   (marks the payment `verified` and the order `Paid`) or **Reject** it
   (marks `rejected`; the customer sees the rejection in My Orders).
   Vice-Admins can update fulfillment status but cannot verify payments.
7. The customer sees the live verification state in **My Orders** and on
   the order confirmation page.

If a wallet number is ever emptied in Settings, checkout marks that method
as *not configured / unavailable* instead of showing a wrong account.

## Customer Features

- Sticky header with category mega-menu, predictive search with live
  autocomplete suggestions, live cart counter, wishlist and account menu
- Homepage: hero carousel (autoplay + touch swipe), Flash Sale with live
  countdown timer, category icon grid, "Just For You" catalog with
  category filter tabs and load-more pagination
- Product page: image gallery with thumbnails + hover zoom, variant
  selection (size/color) that adjusts price and stock, shipping cost and
  estimated delivery window, COD badge, rating breakdown + reviews,
  Q&A accordion, sticky Add to Cart / Buy Now
- Cart drawer + cart page with live subtotal, shipping and voucher
  validation (`GET /api/coupons/validate/:code`)
- 3-step checkout: Address → Delivery (Standard/Express) → Payment
- Order confirmation with unique Order ID (`MLC-...`) and tracking status
- My Orders with status tabs (Pending / Processing / Shipped / Delivered /
  Cancelled) and self-service cancellation (Pending/Processing only)
- Persistent mobile bottom navigation

## Admin Suite (`/admin`)

- **Analytics dashboard:** gross revenue, active orders, low-stock alerts,
  total SKUs, daily order chart and top-category revenue
  (`GET /api/admin/analytics`)
- **Products:** full CRUD with multi-image URLs, category/sub-category,
  base + sale price, stock, SKU, tags, flash-sale flag, statuses
  (Active / Draft / Out of Stock / Archived); the list supports instant
  search, category filtering and **inline price/stock editing**
- **Categories:** create categories with lucide icon names and
  sub-categories; ordering via `sortOrder`
- **Order fulfillment:** status filters + Order ID search, order detail
  drawer (customer, shipping, items, payment + verification), status
  pipeline with automatic `statusHistory` timestamps
- **Coupons:** percentage or fixed-amount codes with minimum spend,
  optional max discount, usage limits and expiry (`WELCOME10` = 10% off
  is seeded)
- **Roles & Users:** Super Admin role assignment
- **Settings:** shipping fees, COD/card toggles, OTP sender identities,
  JazzCash/Easypaisa accounts

## API Summary

| Area | Endpoints |
|---|---|
| Auth | `POST /api/auth/signup/email-otp`, `/signup/verify-email`, `/signup/phone-otp`, `/signup/verify-phone`, `POST /api/auth/login/otp`, `/login/verify`, `POST /api/auth/login/password` (staff), `POST /api/auth/password-reset/request`, `/password-reset/owner/verify` (Super Admin OTP), `/password-reset/complete` (approved token), `POST /api/auth/google`, `GET /api/auth/me`, `POST /api/auth/addresses` |
| Products | `GET /api/products` (search/filter/sort/page), `GET /api/products/suggest?q=`, `GET /api/products/:slug`, `POST/PUT/PATCH/DELETE` (staff), reviews + Q&A under `/api/products/:id/...` |
| Categories | `GET /api/categories`, `POST/PUT` (staff), `DELETE` (Super Admin) |
| Orders | `POST /api/orders` (login required), `GET /api/orders/my`, `GET /api/orders/:orderId`, `PATCH /api/orders/:orderId/cancel` |
| Coupons | `GET /api/coupons/validate/:code?subtotal=`, CRUD under `/api/coupons` (Super Admin) |
| Admin | `GET /api/admin/analytics`, `GET /api/admin/orders`, `PATCH /api/admin/orders/:id/status`, `PATCH /api/admin/orders/:id/payment-verification` (Super Admin), `GET /api/admin/users`, `POST /api/admin/users` (Super Admin — create Vice-Admin), `PATCH /api/admin/users/:id/role`, `GET /api/admin/password-resets`, `PATCH /api/admin/password-resets/:id/approve` / `/reject` (Super Admin), `GET/PUT /api/admin/settings` |
| Uploads | `POST /api/uploads/payment-screenshot` (login required, multipart field `screenshot`) |
| Settings | `GET /api/settings/public` — safe payment subset for checkout |

## Data Models (Mongoose)

- **User** — name, email, phone, `role: admin | vice-admin | customer`,
  addresses[], `emailVerified`, `phoneVerified`, `googleId`, avatar,
  `passwordHash` (staff only, scrypt, never returned by the API),
  `accountStatus: active | pending_setup`
- **PasswordResetRequest** — user, email,
  `status: pending | approved | rejected | used | superseded`,
  `autoApproved` (Super Admin only), `approvedBy`, SHA-256 hashed reset
  token + 1-hour expiry (token exists only after approval)
- **Product** — title, slug, description, images[], category, subCategory,
  basePrice, salePrice, stock, sku (unique, indexed), variants[] (price
  deltas + variant stock), tags, status, flashSale, ratings breakdown, Q&A
- **Category** — name, slug, icon, subCategories[], sortOrder
- **Order** — orderId (unique), user, items[], subtotal, discount,
  couponCode, shipping, total, paymentMethod
  (`COD | Card | JazzCash | Easypaisa`), paymentStatus, payment screenshot
  + transaction fields + verification status, deliveryMethod, status,
  statusHistory[] (timestamps), address, estimatedDelivery
- **Coupon** — code, type (`percentage | fixed`), value, minSpend,
  maxDiscount, expiresAt, active, usageLimit/usedCount
- **Review** — product, user, rating, comment, images, verifiedPurchase
- **OtpToken** — identifier, channel (`email | whatsapp | sms`), purpose,
  SHA-256 hashed code, attempts, expiry (TTL index)
- **Settings** — single store document: fees, toggles, OTP senders,
  JazzCash/Easypaisa accounts

## Deploying on Vercel (services)

The repo root contains a `vercel.json` that deploys this repository as ONE
Vercel project with two services:

| Service  | Root      | Framework | Reachable at                     |
| -------- | --------- | --------- | -------------------------------- |
| `client` | `client/` | Vite      | `/(.*)` — the storefront SPA     |
| `server` | `server/` | Express   | `/api/(.*)` and `/uploads/(.*)`  |

Routing is defined by the top-level `rewrites` (most specific first, the
client catch-all last). Both services share one domain and the project's
environment variables. The server keeps its `/api/...` route mounting, and
the client calls the relative path `/api`, so no absolute API URL is baked
into the browser bundle.

**Binding:** `client` declares one service binding to `server`
(`env: SERVER_URL`). Important: bindings resolve at runtime in functions
only — the browser bundle cannot (and must not) use the internal service
URL, so browser traffic uses the public `/api` rewrite above. The binding
documents the client→server dependency and is available to any future
server-side runtime in the client service. The server calls no internal
service; its dependencies (MongoDB, Google, SMTP, WhatsApp, Twilio) are
external and configured via environment variables.

**Set these environment variables on the Vercel project** (do NOT rely on
the local defaults): `MONGO_URI` (e.g. MongoDB Atlas — a local
`127.0.0.1` database is unreachable from Vercel), `JWT_SECRET`,
`CLIENT_URL` (your deployment domain; same-host origins are also accepted
by the API's CORS middleware), plus any provider credentials you use
(`SMTP_*`, `WHATSAPP_*`, `TWILIO_*`, `GOOGLE_CLIENT_ID/SECRET`) and the
OTP/JazzCash/Easypaisa settings from `.env.example`. Do not set
`SERVER_URL` yourself — Vercel injects it from the binding.

Run everything locally the Vercel way with `vercel dev` from the repo root,
or use the classic two-terminal flow from Quick Start.

> ⚠️ Uploads on Vercel: payment screenshots are written to the server's
> local `uploads/` directory. Serverless filesystems are ephemeral, so on
> Vercel those files are not durable storage — move screenshots to object
> storage (e.g. Vercel Blob / S3) for a production deployment.

## Notes & Limitations

- Cart and wishlist are stored client-side (localStorage) so guests can
  shop before logging in; orders are always created server-side with
  prices recomputed from the database.
- Card payments and Google sign-in are demo/simulated until real provider
  credentials are configured (see above).
- Uploaded screenshots are served from `/uploads`. For a production
  deployment handling sensitive receipts, put them behind authenticated or
  signed access.
- Prices are in Pakistani Rupees (Rs. / PKR) throughout.

## License

MIT
