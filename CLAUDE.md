# MerchantSpace — project memory

A white-label VTEX Seller Portal, replacing the deprecated one, plus an MCP
server so the same operations can be driven from a conversation.

This file is loaded into every session, so it stays short. Durable knowledge
lives in `docs/`.

## Reference docs — read before planning VTEX work

- **[docs/vtex-gotchas.md](docs/vtex-gotchas.md)** — what this project
  established against a live seller account: which endpoints are dead, which are
  full replaces rather than patches, the asynchronous propagation, the
  freight-table semantics. Most entries exist because something failed silently
  first. **Start here.**
- **[docs/mcp-server.md](docs/mcp-server.md)** — the MCP server, its 55 tools,
  connector setup, and the tool-list cache that will otherwise waste an hour.
- **[docs/session-log.md](docs/session-log.md)** — how the project got here, and
  why. In French, as written.

## Context

- **Purpose:** prospect demos — a custom portal in place of the deprecated VTEX
  Seller Portal, and an MCP server so a seller's account can be operated from
  claude.ai.
- **Two accounts:** a marketplace account and a seller account, both configured
  through env vars. The seller account is a **CatalogV2 / Seller Portal** account,
  which is what makes several VTEX APIs behave differently — see the gotchas.
- **Scope:** single seller. Multi-account is the main piece of work not done.
- **Approach:** native VTEX APIs, deliberately **not** the External Seller
  Protocol. That choice is why the vendored `marketplace-*` agent skills only
  partly apply — see the last section of the gotchas.
- No local database. Every read and write goes to VTEX.

## Stack

- Next.js 16.2.6, App Router, TypeScript strict
- Tailwind CSS + shadcn/ui, recharts for the dashboard
- Auth: two paths exist. The login page offers **Google sign-in** first, which
  needs your own Google OAuth client and goes through VTEX's headless exchange —
  that exchange proved unreliable against VTEX's native Google provider, which is
  configured in the Admin and not meant to be driven headlessly. The path that
  works and is used in practice is **VTEX ID access-key OTP**, which needs no
  Google project at all.
- App Key/Token stay server-side: Server Components, Server Actions and Route
  Handlers only. They never reach the browser.
- Target host: Vercel. The app is stateless.

## Design system

Modern admin SaaS: fixed 240px `zinc-900` sidebar with `lucide-react` icons,
`indigo-600` accents, light only, Inter via `next/font/google`.

## Environment

See `.env.local.example` for the full list with comments. In short: an account
name, App Key and App Token per account (marketplace and seller),
`VTEX_SELLER_ID`, `NEXTAUTH_SECRET`, and `MCP_SERVER_TOKEN` for the MCP route.

`MCP_SERVER_TOKEN` is required for `/api/mcp` — the route fails closed without
it, on purpose, because it can mutate live seller data.

## State

Web app: auth, dashboard, catalog, orders, fulfillment, payments and the
onboarding wizard are all in place.

MCP server: **55 tools**, covering orders (including invoicing, which is what
actually dispatches an order on these accounts), the full shipping chain
(policies, freight tables, docks, warehouses, trade policies), catalog, pricing,
stock and shipping simulation. Every read tool and every reversible write tool
has been exercised against a live account.

### Known blockers, both permissions

- **Seller App Key** needs the `vtex.catalog-images` License Manager resource.
  This blocks *uploading* new image bytes from the MCP; the code is complete and
  will work the day it is granted. Attaching an image already hosted on
  `{account}.vtexassets.com` works today and needs nothing.
- **Marketplace App Key** needs Seller Register / Marketplace resources, which
  would repair `vtex_get_seller_commissions` and the sales-channel mapping. Note
  that `POST /seller-register/pvt/sellers` answers **404** rather than a
  permission error, which looks more like the app not being provisioned.

### Worth doing next

- **Multi-account.** The only real remaining feature: today the seller account is
  fixed in env vars, so each user needs their own deployment. All env reads are
  centralised at the top of `lib/vtex/client.ts` — that is the isolation point.
- `lib/vtex/catalog.ts` is past 1,100 lines. Extracting its logistics half is
  worthwhile and independent of any feature.
- Tool argument shapes are inconsistent (`skuId` string vs `productId` integer;
  `update_brand` flat vs `update_product` nested). Harmonising them would help a
  model caller but changes tool contracts.

## Conventions established here

- **Every VTEX update is read-merge-write.** Nearly all of these endpoints are
  full replaces that reset omitted fields. Four tools were written the naive way
  and lost data or failed silently for months.
- **Never infer success from an HTTP status.** VTEX writes propagate
  asynchronously; re-read the record and compare. Order and logistics actions
  distinguish *applied* from *accepted-pending*, and on the latter the caller must
  re-read rather than retry.
- **A tool that cannot work is worse than no tool.** Errors name the missing
  permission; tools that can never succeed on this account type were removed
  rather than left for a model to pick.
- **Verify against a live account, through the MCP route.** Type-checking and
  building prove nothing here: several tools passed both and failed on every real
  call.
- Unknown VTEX statuses are tolerated, never rejected by a closed enum.

## VTEX Admin links

Replace `<account>` with the relevant account name.

- App Keys: `https://<account>.myvtex.com/admin/license-manager/#/home`
- Auth settings: `https://<account>.myvtex.com/admin/account-settings/authentication`
