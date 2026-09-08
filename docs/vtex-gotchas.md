# VTEX gotchas on a Seller Portal account

Everything here was established against a live VTEX **seller** account
(CatalogV2 / "Seller Portal"), not read off the documentation. Several entries
contradict the official OpenAPI specs, and those are called out.

Read this before planning work against these APIs. Most entries exist because
something failed silently first.

**Scope.** This is a *seller* account paired with a marketplace account. A
standard VTEX store behaves differently — in particular the classic Catalog API
works there and does not here.

---

## The one rule to remember

> **Almost every write endpoint on these accounts is a full REPLACE, not a patch.
> Any writable field you leave out is reset.**

Confirmed on five surfaces: products, shipping policies, docks, warehouses, and
SKUs. The only exception is freight-table rows, which are a genuine upsert.

So the pattern for every update is **read the record, merge your change, send the
whole thing back**. A partial write destroys the rest of the object with a 200
and no warning. Four tools in this repo were written the naive way and failed or
lost data for months before anyone noticed.

---

## Accounts, auth and permissions

**A missing permission arrives as HTML, not as 401.** On the marketplace account
every `GET /seller-register/pvt/*` goes through four redirects and lands on
`/admin/login/?portal=true` with **HTTP 200** and `content-type: text/html` —
not on the `/Admin/Site/Login.aspx` the first 302 advertises. `fetch` follows the
chain, so the caller gets a 200 carrying a login form and `JSON.parse` dies on
`Unexpected token '<'`: a permission problem disguised as a parsing bug.

Detect it on the **content type**, never on the URL. `assertJsonResponse()` in
`lib/vtex/client.ts` rejects any `text/html` body on a successful response; every
call in this codebase sends `Accept: application/json`, so HTML is always wrong.
An earlier attempt matched the advertised login path and never fired once.

**A failing route may also answer with an HTML error page on a 4xx.** That goes
down the error branch rather than the success one, so it needs its own handling —
see `describeErrorBody()`. Otherwise the caller receives 150 characters of
`<!DOCTYPE html>` instead of a diagnosis.

**App Key/Token cannot authenticate VTEX IO apps.** `vtex.catalog-images` and
friends require a real user credential. `POST /api/vtexid/apptoken/login`
exchanges an App Key/Token pair for a genuine `VtexIdclientAutCookie` (~572
characters), which lets a server authenticate itself with no browser session.
The token inherits the key's permissions and nothing more.

**`VtexIdclientAutCookie` is scoped to `*.vtexcommercestable.com.br`.** Never try
to read that cookie from an app on a custom domain (Vercel included).

**Pagination is not uniform.** OMS and Catalog use the `REST-Range` header;
Master Data uses `_from` / `_to` query params. Both are normalised in the fetch
wrapper.

---

## Catalog

**The classic Catalog API is dead on these accounts.** `GET
/api/catalog/pvt/product/{id}`, `/api/catalog/pvt/stockkeepingunit/{id}` and
`.../{id}/file` all answer **500**, while
`/api/catalog-seller-portal/products/{id}` answers 200. Anything the VTEX docs
describe on the classic surface — including `POST
/api/catalog/pvt/stockkeepingunit/{skuId}/file`, presented as *the* way to attach
an image by URL with an App Key — is unusable here. Do not plan on it.

**Write products through `/api/catalog-seller-portal/products/{id}`.** There is
no per-SKU write surface: a SKU lives inside its product's `skus[]`. To update
one SKU, resolve its product via
`/api/catalog_system/pvt/sku/stockKeepingUnitById/{skuId}`, read the product,
merge that one SKU in place, and re-send the whole product.

**Weights are in GRAMS on the Seller Portal surface.** Established by
simulation, not inference: a 300 g SKU at quantity 3 fell outside a `0–500`
freight band and the delivery option vanished; at quantity 1 it appeared.
`PackagedWeightKg` in this codebase is kilograms at the boundary and converted
on the way in.

**Nothing is really deleted in VTEX — brands, categories and products are
deactivated.** Every `DELETE` route for a brand answers 405, and the classic one
500s. Use the update call with `isActive: false`. Logistics entities are the
exception: warehouses, docks, shipping policies and product images genuinely can
be deleted.

**Product images must already be hosted on `{account}.vtexassets.com`.** `PUT
/api/catalog-seller-portal/products/{id}` rejects any other URL with
`ImageUrlInvalidException`. Attaching a hosted image needs no special permission
and works today. *Uploading* new bytes requires the `vtex.catalog-images`
License Manager resource on the App Key — every other route was tested and
refused:

| Route | Result |
|---|---|
| `vtex.catalog-images` IO app | 403, role lacks the resource |
| `POST /catalog/pvt/stockkeepingunit/{id}/file` | 500, classic Catalog is dead |
| `PUT {account}.vtexassets.com/arquivos/{name}` | 403 from CloudFront |
| `PUT /portal/pvt/sites/default/files/{name}` | authenticates, then 403 |

**Brand listing has no working endpoint either.** `catalog_system/pvt/brand/list`
500s, so brands are reconstructed from the SKUs of the first N products. A brand
no product uses will not appear in a listing even though it exists.

**The `catalog_system` seller endpoints do work.** `GET
/api/catalog_system/pvt/seller/list` and `.../seller/{sellerId}` answer 200 with
the marketplace key and already carry `ProductCommissionPercentage` and
`FreightCommissionPercentage`. This is the historical surface — poorer than
Seller Register (no per-category overrides) but available without a new
permission.

---

## Orders and OMS

**The seller account runs its OWN OMS.** It holds the fulfillment-side
counterpart of each marketplace order, under a different id and a different
status vocabulary:

| Surface | Example id | Status |
|---|---|---|
| Marketplace + `f_sellerNames` | `1636850500482-01` | `payment-approved` |
| Seller account's own OMS | `FRN-1636850500005-01` | `waiting-seller-handling` |

**Only the seller-side ids are accepted by the action endpoints.** A marketplace
id passed to `start-handling` returns 404. The link between the two is visible in
the seller payload (`origin: "Chain"`, `marketplaceServicesEndpoint`,
`affiliateId`) but **`marketplaceOrderId` is empty** on chained orders — do not
rely on it to walk back to the marketplace order.

**🔴 OMS workflow transitions are ASYNCHRONOUS.** Measured: an invoice notified
at `10:35:36` was applied to the order at `10:35:42` — **six seconds**. A single
immediate re-read reported failure on an action that had entirely succeeded.
This is not cosmetic: on an irreversible action a false failure invites a retry,
and during those six seconds `invoicedDate` was still empty, so the
anti-duplicate guard would have let a second invoice through. Re-read with
retries, and distinguish *applied* from *accepted-pending*. On the latter the
instruction is **re-read, never retry**.

**The list and the detail endpoints disagree about status.** `GET
/api/oms/pvt/orders` goes through the order index, which lags; `GET
.../orders/{id}` does not. Observed on the same order: the list said
`ready-for-handling`, the detail said `waiting-seller-handling`. **After any
action, re-read the detail, never the list** — otherwise you report a failure on
a success.

**Never infer success from an HTTP code.** VTEX's own docs require validating an
exact `204` and warn that `start-handling` "can also respond with status 500".
Read the order back and compare the status before and after. Cost: one extra GET
per action. Worth it — it is the only protection against a 2xx with no effect.

**`start-handling` requires `ready-for-handling`.** On an order in
`waiting-seller-handling` VTEX answers **400** with
`{"error":{"code":"OMS003","message":"Order status should be ready-for-handling
to perform this action"}}`. A chained order that VTEX has already authorized
(`authorizedDate` set, `statusDescription: "Aguardando despacho do seller"`) is
waiting for a **dispatch**, not for handling. Note that two orders at the same
status produced different answers — one a clean 400, one a 2xx with no effect —
so handle both.

**On these accounts the invoice IS the dispatch.** It is the verb that actually
moves an order out of `waiting-seller-handling`, not `start-handling`. Invoicing
is therefore load-bearing, not cosmetic.

**Never close the status enum on the seller side.** `waiting-seller-handling` is
absent from the marketplace `OrderStatus` union. A closed enum on a seller-side
filter rejects valid values; VTEX documents explicitly that unknown statuses
must be tolerated.

**Item prices in an invoice are UNIT prices, in cents.** The OMS multiplies by
quantity itself. `invoiceValue` is the total, also in cents; the OpenAPI types it
as a string but a number is accepted.

---

## Logistics and shipping

### The chain, and where each link lives

```
warehouse.warehouseDocks[].dockId  →  dock          (stock reaches a dock)
dock.freightTableIds               →  policy        (dock serves the policy)
dock.salesChannels                 →  trade policy  (dock sells on a channel)
freight table rows for the policy                   (there is a price)
```

**None of these links is visible from the policy.** A shipping policy cannot
declare its own docks, and a policy with no dock **never appears in shipping
simulation**, however active it looks. This is why a policy can seem perfectly
configured and quote nothing.

### Docks and warehouses

**Their updates go through the CREATE endpoint.** `POST
/configuration/docks/{dockId}` and `PUT /configuration/warehouses/{id}` are both
refused with *"does not support http method"*. You must `POST` to the
**collection** with the `id` in the body.

**`dock.salesChannels` is `["1"]`, not `[{ id: "1" }]`.** Sending the object form
is silently wrong.

**Logistics writes propagate asynchronously too.** A read taken immediately after
a successful POST can return the previous record — observed on a dock where both
a rename and a `freightTableIds` change were invisible on the first read-back and
correct a second later.

### Shipping policies

**🔴 The OpenAPI spec for `PUT /api/logistics/pvt/shipping-policies/{id}` is
wrong twice.**

1. It requires `deliveryOnWeekends`, a single boolean. **That field is inert**: a
   PUT carrying `deliveryOnWeekends: true` returns 200 and leaves
   `weekendAndHolidays` all false. The field that works is `weekendAndHolidays` —
   the same object GET and POST use — which the spec does not list for PUT at all.
2. The endpoint is a full replace. Omitting `numberOfItemsPerShipment` took it
   from `5` to `null`.

**The policy id is chosen by the caller** on create, not generated by VTEX.

**`carrierInfo.linkedDocks` is only populated by the LIST endpoint.** The same
policy read by id returns `[]` for it. Read dock links from the listing, never
from the get-by-id.

### Freight tables (rate tables)

**No spreadsheet upload is needed.** `POST
/api/logistics/pvt/configuration/freights/{carrierId}/values/update` takes JSON,
where `carrierId` **is the shipping policy id**.

**`operationType` semantics, established live:**

| Value | Effect |
|---|---|
| `1` | True **upsert** on the row key. An identical row never duplicates; the same row with another price updates it |
| `2` | Update |
| `3` | Delete that row, leave the rest |

A row's key is its **postal-code range + weight range + country**. So a write is
an upsert of the rows you name; rows you do not mention stay untouched. It is
**not** a replace.

**🔴 Postal codes are stored left-zero-padded to 8 digits.** `10000` becomes
`"00010000"`. A five-digit code sent unpadded addresses a completely different
range. This is not cosmetic.

**🔴 The weight band is part of a row's IDENTITY.** Widening `weightEnd` does not
edit the row — it creates a second one beside it. To widen: write the wide row
**then** delete the narrow one, in that order, so coverage is never interrupted.

**A table cannot be read as a whole.** `/freights/{id}/values` answers 500; only
`/freights/{id}/{postalCode}/values` responds, returning the rows covering *that*
code. So there is no read-modify-write here, and no "show me my rate table". The
upsert semantics make that harmless for writes.

**`GET /configuration/freights` is the diagnostic surface.** It carries
`freightTableValueError`, so an empty table announces itself (*"No files to
proccess…"*), and that error **clears after an API write**, not only after a
spreadsheet upload.

**`minimumValueInsurance` is added to the quoted price.** A row with `cost 3` and
`insurance 1` quoted 4.00; rows written through the API carry `insurance 0` and
quote exactly their price. The field is not in the write contract, so rewriting an
existing row loses its insurance component.

**An overlap guard can only see one call.** Rows in a single request can be
compared to each other, but not to what already exists — the table is not
readable as a whole. Two separate calls can therefore create an overlap, and VTEX
accepts overlapping ranges and then quotes an arbitrary one of them.

### Shipping simulation

**🔴 Call it WITHOUT `?sc=`.** With a sales channel the seller account answers
**500 `CHK0290.12`** *"A communication error with Sales Channel has occurred"*;
without the parameter the same request succeeds. `seller: "1"` means the account
itself.

This is the only real proof that the whole chain lines up. Vary the quantity: an
option present at 1 and gone at 2 is a weight-band ceiling, not a coverage hole.

---

## MCP and the claude.ai connector

**🔴 claude.ai caches the tool list, keyed on the connector URL.** After a deploy
that adds or renames tools, the connector keeps announcing the old list — and
deleting and recreating the connector with **the same URL** changes nothing,
because the cache key is identical. The symptom is misleading: the session
answers honestly that a tool does not exist, and the old *title* of a renamed
tool stays visible.

Workaround: append an inert parameter to the URL — `&v=2`, then `&v=3`… The route
reads only `token`, so anything else is ignored. Check the server before
suspecting the code:

```bash
curl -s -X POST '<url>' -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

**Tool descriptions are a context budget.** The whole list is sent on every
session — currently about 40 KB, roughly 10,000 tokens. A tool that cannot work
on the target account is worse than absent: a model may pick it over the one that
does.

**Argument shapes are not consistent** across the tools in this repo: `skuId` is
a string in the pricing and inventory tools and an integer elsewhere, and
`update_brand` takes its fields flat while `update_product` and `update_sku` nest
them under `updates`. Known wart; changing them would alter tool contracts.

---

## Next.js 16 specifics

- `middleware.ts` is renamed `proxy.ts`, with a named `proxy` export rather than
  `middleware`.
- shadcn v4 deprecated the `toast` component — use `sonner`.
- `create-next-app` refuses directory names with spaces or capitals. Generate in
  a temporary directory and move it.

---

## Where the vendored VTEX marketplace skills do not apply

The `marketplace-*` agent skills are written for the **External Seller
Protocol** — a non-VTEX seller pushing into a third party's marketplace. This
project uses native VTEX APIs against a VTEX seller account, so two of their
hard constraints do not hold here:

- **"Use SKU Integration API, not direct Catalog API"** — it warns that a
  seller's direct catalog writes return 403 and mandates `changenotification` plus
  suggestions. Not applicable: the seller account owns **its own** catalog. We are
  not writing into the marketplace's catalog.
- **"Marketplace order ID in OMS paths"** — it forbids using a reservation id in
  `/api/oms/pvt/orders/{id}/...`. Not applicable: `FRN-…` is not a local
  reservation id, it is a real OMS order id **inside the seller account**.

What does apply and is implemented: an `invoiced` order cannot be cancelled
without a return invoice (`type: "Input"`); `GET /api/oms/pvt/orders` depends on
the index, so re-read the detail after an action; tolerate unknown statuses.

Rate-limit backoff is a **deliberate non-goal**: the fetch wrapper raises a typed
`VtexRateLimitError` without retrying, and no tool loops — a human triggers them
one at a time. Add backoff before adding any batch tool.
