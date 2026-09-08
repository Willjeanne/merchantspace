# MerchantSpace — a custom VTEX Seller Portal

A white-label Seller Portal built on native VTEX APIs, replacing the deprecated
one with a clean admin interface — plus an **MCP server** so the same operations
can be driven from a conversation with an assistant.

Built for prospect demos and as a working reference for what these APIs actually
do on a Seller Portal account. It is not a supported VTEX product.

**Stack:** Next.js 16 App Router · TypeScript · Tailwind CSS · shadcn/ui · Vercel

---

## Read this first

**[docs/vtex-gotchas.md](docs/vtex-gotchas.md)** — everything this project
established against a live seller account, much of it contradicting the official
specs. Nearly every write endpoint is a full replace that silently resets
omitted fields; the classic Catalog API is dead on these accounts; workflow
writes propagate asynchronously. Four tools here were written the obvious way
and failed or lost data for months before anyone checked.

If you are about to call a VTEX logistics or catalog endpoint, that file will
save you an afternoon.

---

## What it does

| Module | Features |
|--------|----------|
| **Auth** | VTEX ID email OTP (access key). A Google sign-in button also exists but relies on VTEX's headless exchange, which proved unreliable — OTP is the path to use |
| **Dashboard** | Revenue chart, order KPIs, recent orders |
| **Catalog** | Products and SKUs, inline price and stock editing, brands, category tree, images |
| **Orders** | List with status filters, order detail, invoicing (which is what dispatches an order) |
| **Fulfillment** | Warehouses, docks, shipping policies |
| **Payments** | Order splits with commission and PSP fee, payout calendar, reconciliation, DAC7 tracking |
| **Onboarding** | 5-step KYC/KYB wizard ending in seller activation |
| **MCP server** | 55 tools over the same VTEX wrappers — see [docs/mcp-server.md](docs/mcp-server.md) |

---

## Prerequisites

Two VTEX accounts:

| Account | Used for |
|---------|----------|
| **Marketplace** | reading orders, seller records, commissions |
| **Seller** | products, SKUs, prices, stock, logistics, shipping — everything writable |

The seller account is expected to be a **CatalogV2 / Seller Portal** account.
That is not a detail: on those accounts the classic Catalog API returns 500 and
this app routes around it. A standard VTEX store behaves differently.

Every account name and credential is read from `.env.local` at runtime. Pointing
the portal at a different seller needs no code change.

---

## Setup

```bash
git clone <this repo>
cd merchantspace
npm install
cp .env.local.example .env.local
```

### App Keys

Create one App Key per account in **VTEX Admin → Account Settings → API Keys**.

**Marketplace key** — for reading orders and sellers:

- `OMS` → `OMS access` → **Full access**
- Optionally Seller Register / Marketplace resources, for per-category
  commissions. Without them those specific tools fail with a clear permission
  error rather than misleading data.

**Seller key** — everything writable:

- `CatalogV2` → `Management` → **Product Write** (and read)
- `Logistics` → **Logistics full access** (warehouses, docks, policies, freight tables)
- `Pricing` → **Full access**
- `Inventory` → **Full access**
- `OMS` → `OMS access` → **Notify invoice** and **Change order workflow status**
- `vtex.catalog-images`, if you want to upload new image bytes. Without it you
  can still attach images already hosted on `{account}.vtexassets.com`.

> The predefined **Seller** role is a reasonable base; add the missing resources
> on top of it.

### Environment variables

`.env.local.example` lists every variable with comments. Fill in the account
names, the two key/token pairs, `VTEX_SELLER_ID`, a `NEXTAUTH_SECRET`, and
`MCP_SERVER_TOKEN` if you intend to use the MCP server.

`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` are only needed if you want the
Google sign-in button to work. Leave them empty and use the access-key OTP.

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Log in with any email that
has access to the seller VTEX account — VTEX sends a 6-digit code to it.

---

## Deploy

Connect the repo in the [Vercel dashboard](https://vercel.com/new) and add the
env vars under **Project → Settings → Environment Variables**, or:

```bash
npm install -g vercel
vercel
```

The app is stateless: no database, no migrations.

---

## MCP server

`app/api/mcp` exposes 55 tools over the same VTEX wrappers the web app uses, so
an assistant can read and act on the account in conversation — list orders and
invoice one, build a shipping policy and its rate table, wire a warehouse
through to a trade policy, or ask why a policy is not quoting.

It is a normal Route Handler, so there is no separate process: it lives at
`/api/mcp` on the same deployment.

**[docs/mcp-server.md](docs/mcp-server.md)** covers authentication, connecting a
claude.ai connector, the full tool inventory, and the tool-list cache that will
otherwise convince you a deploy did not work.

---

## Architecture

```
app/
├── (auth)/login/          OTP login
├── (portal)/              protected layout (sidebar + topbar)
│   ├── dashboard/  catalog/  orders/  fulfillment/  payments/  onboarding/  settings/
└── api/
    ├── auth/              OTP send/validate, logout
    └── mcp/               MCP server route (token-gated)

lib/
├── vtex/
│   ├── client.ts              vtexFetch (marketplace) + vtexSellerFetch (seller)
│   ├── catalog.ts             products, SKUs, brands, categories, images, warehouses, docks
│   ├── orders.ts              marketplace and seller-account OMS
│   ├── shipping-policies.ts   policies CRUD
│   ├── freight-rates.ts       rate tables by postal-code range
│   ├── shipping-setup.ts      the warehouse → dock → policy → trade policy chain, and simulation
│   ├── sellers.ts             seller records and commissions
│   └── payments.ts            order splits and payout derivation
├── mcp/
│   ├── register.ts            wires every tool group
│   ├── tools/                 one file per domain
│   └── apps/                  interactive MCP App (create-product form)
├── actions/                   Server Actions used by the forms
├── types/                     VTEX response types
└── mock/                      demo-only data (settlements, onboarding)

proxy.ts                       Next.js middleware — auth guard
```

**Credentials never reach the browser.** Every VTEX call happens in a Server
Component, Server Action or Route Handler. The user's VTEX session lives in an
`httpOnly` cookie.

---

## Known limitations

- **Uploading new image bytes** needs the `vtex.catalog-images` resource on the
  seller App Key. The code is complete; without the grant the upload returns 403
  and says so. Attaching an already-hosted image works with no extra permission.
- **Single seller.** The seller account is fixed in env vars, so each user needs
  their own deployment. Multi-account is the main piece of work not done.
- **Per-category seller commissions** need Seller Register resources on the
  marketplace key. Account-level rates are available without them.
- **Payments** reads real orders and applies configurable rates, but payout
  disbursement is simulated — no live Adyen Reporting integration.
- **Onboarding** is complete as a UI and demo flow; production use needs a real
  KYB provider and e-signature service.
- **No rate-limit backoff.** The wrapper raises a typed error without retrying,
  which is fine while a human triggers operations one at a time. Add backoff
  before adding any batch tool.

---

## Contributing

Two conventions matter more than style here, both learned the hard way:

1. **Every VTEX update is read-merge-write.** Read the record, merge your change,
   send the whole thing back. A partial write returns 200 and destroys the rest of
   the object.
2. **Verify against a live account.** `tsc` and `next build` prove nothing about
   these APIs. Several tools passed both and failed on every real call.

[docs/session-log.md](docs/session-log.md) records how each decision was reached,
in French.

---

## License

MIT
