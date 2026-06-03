# MerchantSpace — Custom VTEX Seller Portal

A modern, white-label Seller Portal built on top of VTEX native APIs. Replaces the deprecated VTEX Seller Portal with a clean admin SaaS interface.

**Stack:** Next.js 14 App Router · TypeScript · Tailwind CSS · shadcn/ui · Vercel

---

## What it does

| Module | Features |
|--------|----------|
| **Auth** | VTEX ID login via email OTP (access key) — no Google Cloud required |
| **Dashboard** | Revenue chart, order KPIs, recent orders |
| **Catalog** | List / create / edit products & SKUs, inline price & stock editing, brands CRUD, category tree, image upload |
| **Orders** | Order list with status filters, order detail |
| **Fulfillment** | Warehouse CRUD, dock CRUD, shipping policies |
| **Payments** | Order splits with marketplace commission (1.15%) + PSP fee (0.2%), payout calendar, reconciliation table, DAC7 compliance tracking |
| **Onboarding** | 5-step KYC wizard — legal info, document upload, automated checks, e-signature, VTEX seller account activation |

---

## Prerequisites

You need **two VTEX accounts**:

| Account | Role | Used for |
|---------|------|----------|
| **Marketplace account** | your main marketplace (e.g. `acme-marketplace`) | Reading orders, catalog browsing |
| **Seller account** | the seller account (e.g. `acme-seller`) | Managing products, SKUs, prices, stock |

All account names are read from `.env.local` — no code edits required.

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/Willjeanne/merchantspace.git
cd merchantspace
npm install
```

### 2. Create environment file

```bash
cp .env.local.example .env.local
```

Then fill in all values (see section below).

### 3. Create VTEX App Keys

You need **two separate App Keys** — one per account.

#### Marketplace App Key (`VTEX_APP_KEY` / `VTEX_APP_TOKEN`)

Go to **VTEX Admin → Account Settings → API Keys** for your **marketplace** account.

Required License Manager resources:
- `OMS` → `Orders` → **Full access**
- `Catalog` → `Content` → **SKUs** *(needed for image upload)*

#### Seller App Key (`VTEX_SELLER_APP_KEY` / `VTEX_SELLER_APP_TOKEN`)

Go to **VTEX Admin → Account Settings → API Keys** for your **seller** account.

Required License Manager resources:
- `CatalogV2` → `Management` → **Product Write**
- `CatalogV2` → `Management` → **Product Read** (or full access)
- `Logistics` → **Full access** *(for warehouses/docks)*
- `Pricing` → **Full access**
- `Inventory` → **Full access**

> **Tip:** Use the predefined role **"Seller"** as a base and add the missing resources on top.

### 4. Configure environment variables

Open `.env.local` and set:

```env
# ── Marketplace account ───────────────────────────────────────────────────────
VTEX_ACCOUNT=your-marketplace-account
VTEX_APP_KEY=vtexappkey-your-marketplace-account-XXXXXX
VTEX_APP_TOKEN=<token>
VTEX_ENVIRONMENT=vtexcommercestable

# ── Seller account ────────────────────────────────────────────────────────────
VTEX_SELLER_ACCOUNT=your-seller-account
VTEX_SELLER_APP_KEY=vtexappkey-your-seller-account-XXXXXX
VTEX_SELLER_APP_TOKEN=<token>

# Seller ID as it appears in the marketplace (check VTEX Admin → Marketplace → Sellers)
VTEX_SELLER_ID=your-seller-id

# ── Auth ──────────────────────────────────────────────────────────────────────
# Generate with: openssl rand -base64 32
NEXTAUTH_SECRET=<random_32_byte_string>
NEXTAUTH_URL=http://localhost:3000

# ── Public (used client-side) ─────────────────────────────────────────────────
NEXT_PUBLIC_VTEX_ACCOUNT=your-marketplace-account
NEXT_PUBLIC_VTEX_SELLER_ACCOUNT=your-seller-account
```

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to `/login`.

Log in with any email address that has access to the seller VTEX account. VTEX will send a 6-digit OTP to that email.

---

## Adapting to a different VTEX account

To point this portal at a **different seller**, only env vars need to change — no code edits required.

| What changes | Where |
|---|---|
| Marketplace account name | `VTEX_ACCOUNT` + `NEXT_PUBLIC_VTEX_ACCOUNT` |
| Marketplace App Key / Token | `VTEX_APP_KEY` + `VTEX_APP_TOKEN` |
| Seller account name | `VTEX_SELLER_ACCOUNT` |
| Seller App Key / Token | `VTEX_SELLER_APP_KEY` + `VTEX_SELLER_APP_TOKEN` |
| Seller ID (marketplace-side) | `VTEX_SELLER_ID` |

No code changes needed. All account names, endpoints and credentials are read exclusively from env vars at runtime.

---

## Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Or connect the GitHub repo in the [Vercel dashboard](https://vercel.com/new) and add all the env vars above in **Project → Settings → Environment Variables**.

The app is stateless — no database, no migrations needed.

---

## Architecture

```
app/
├── (auth)/login/          → OTP login page
├── (portal)/              → Protected layout (sidebar + topbar)
│   ├── dashboard/         → KPI cards + charts
│   ├── catalog/           → Product list, detail/edit, new product
│   ├── orders/            → Order list + detail
│   ├── fulfillment/       → Warehouses, docks, shipping policies
│   ├── payments/          → Order splits, payout calendar, reconciliation, DAC7
│   ├── onboarding/        → 5-step KYC wizard + seller activation
│   └── settings/          → (placeholder)
└── api/auth/              → OTP send/validate, logout route handlers

lib/
├── vtex/
│   ├── client.ts          → vtexFetch (marketplace) + vtexSellerFetch (seller)
│   ├── catalog.ts         → All catalog API wrappers
│   ├── orders.ts          → OMS API wrappers
│   └── payments.ts        → Order splits + commission calculation
├── config.ts              → Server-side account name constants (from env vars)
├── actions/               → Next.js Server Actions (forms)
├── mock/                  → Mock data for demo mode (Adyen settlements, onboarding)
└── types/                 → TypeScript types for VTEX API responses

proxy.ts                   → Next.js middleware (auth guard)
```

**Data flow:** All VTEX API calls happen server-side (Server Components or Server Actions). App Key / App Token credentials never reach the browser. The user's VTEX session token is stored as an `httpOnly` cookie.

---

## Known limitations

- **Image upload** currently supports URL-based import only. File upload (multipart) is not yet implemented.
- **Multi-seller** is not supported — this is a mono-seller portal by design.
- The **Payments** module fetches real VTEX orders and applies configurable commission rates, but payout disbursement is simulated (no live Adyen Reporting API integration yet).
- The **Onboarding** KYC wizard is fully functional for demo and UI purposes; production use requires connecting a real KYB provider and e-signature service.

---

## License

MIT
