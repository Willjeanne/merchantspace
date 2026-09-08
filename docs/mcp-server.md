# MCP server

`app/api/mcp` exposes a [Model Context Protocol](https://modelcontextprotocol.io)
server so an assistant — claude.ai, Claude Code, any MCP client — can read and
act on a VTEX seller account in conversation. It is the same VTEX wrappers the
web app uses, exposed as tools.

It runs as a normal Next.js Route Handler over Streamable HTTP, so it is
available at `http://localhost:3000/api/mcp` locally and
`https://<your-deployment>/api/mcp` once deployed. There is no separate process.

Built with [`mcp-handler`](https://www.npmjs.com/package/mcp-handler).

---

## Authentication

Every request must carry `MCP_SERVER_TOKEN`, by either route:

```
Authorization: Bearer <MCP_SERVER_TOKEN>     preferred
?token=<MCP_SERVER_TOKEN>                    for clients that only accept a URL
```

```env
MCP_SERVER_TOKEN=<openssl rand -base64 32>
```

It **fails closed**: if `MCP_SERVER_TOKEN` is unset, every request is rejected.
The endpoint calls VTEX with the app's own App Key/Token and can mutate live
seller data, so it must never be reachable without a secret.

> **The `?token=` query fallback is load-bearing, not a convenience.** The
> claude.ai custom-connector UI accepts a bare URL only — the request-headers
> option is org-gated — so this is the only way to authenticate a claude.ai
> connector. Do not remove it.
>
> Treat any URL containing the token as a credential: it lands in browser history
> and request logs where a header would not.

---

## Connecting claude.ai

1. In claude.ai, add a custom connector.
2. Paste the deployment URL with the token **and a version parameter**:

```
https://<your-deployment>/api/mcp?token=<MCP_SERVER_TOKEN>&v=1
```

3. Check the tool count matches what the server reports (see below).

### Why the `&v=N`

**claude.ai caches the tool list, keyed on the connector URL.** After you deploy
new or renamed tools, the connector keeps announcing the old list — and deleting
and recreating the connector with the *same* URL changes nothing, because the
cache key is identical.

The symptom is misleading: the session will tell you honestly that a tool does
not exist, and the old title of a renamed tool stays visible.

So bump the parameter every time you deploy tool changes: `&v=2`, `&v=3`… The
route reads only `token`; anything else is ignored. The number means nothing, it
only has to differ.

**Check the server before suspecting the code:**

```bash
curl -s -X POST 'https://<your-deployment>/api/mcp?token=<TOKEN>' \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

If that returns the new tools and claude.ai does not, it is the cache.

### Other clients

Streamable HTTP clients connect directly:

```json
{
  "mcpServers": {
    "merchantspace": {
      "url": "http://localhost:3000/api/mcp",
      "headers": { "Authorization": "Bearer <MCP_SERVER_TOKEN>" }
    }
  }
}
```

For stdio-only clients, use [`mcp-remote`](https://www.npmjs.com/package/mcp-remote):

```json
{
  "mcpServers": {
    "merchantspace": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "http://localhost:3000/api/mcp",
               "--header", "Authorization: Bearer <MCP_SERVER_TOKEN>"]
    }
  }
}
```

---

## What you can do from a conversation

Some worked examples, each of which maps to one or two tool calls:

- *"List my seller orders"* → then *"invoice FRN-…"*, which is what actually
  dispatches an order on these accounts
- *"Create an Express shipping policy and attach it to my existing dock"*
- *"Charge €5 for postal codes 1 to 31000 and €6 from 31001 to 99999"*
- *"Why doesn't my Express policy show up at checkout?"* →
  `vtex_check_shipping_setup` walks warehouse → dock → policy → trade policy →
  rate table and says what is missing
- *"What would a customer at 75001 actually pay for shipping?"* →
  `vtex_simulate_shipping`, the only real end-to-end proof
- *"Set the price of SKU 7 to €9.99"*, *"put 200 units in stock"*

---

## Tool inventory (55)

**Orders** (7)

| Tool | |
|---|---|
| `vtex_list_seller_orders` | The **actionable** order list — seller-account ids |
| `vtex_get_seller_order` | Detail, plus `allowCancellation` / `allowEdition` |
| `vtex_invoice_order` | Invoice = **dispatch**. Irreversible |
| `vtex_start_handling_order` | Needs `ready-for-handling`; usually refused here |
| `vtex_list_orders` | Marketplace view — ids are **not** actionable |
| `vtex_list_orders_marketplace` | Marketplace-wide, no seller filter |
| `vtex_get_order` | Marketplace order detail |

**Shipping** (11)

| Tool | |
|---|---|
| `vtex_list_shipping_policies` | The writable surface; also the only source of linked docks |
| `vtex_get_shipping_policy` | One policy in full |
| `vtex_create_shipping_policy` | Caller chooses the id |
| `vtex_update_shipping_policy` | Read-merge-write |
| `vtex_list_freight_tables` | Rate-table state; where an empty table explains itself |
| `vtex_get_freight_rates` | Rows covering one postal code |
| `vtex_set_freight_rates` | Prices by postal-code range, in currency and days. Upsert |
| `vtex_delete_freight_rates` | Remove named rows |
| `vtex_list_trade_policies` | Sales channels |
| `vtex_simulate_shipping` | What a customer would be charged |
| `vtex_check_shipping_setup` | Walks the chain, reports what is missing |

**Logistics** (10)

| Tool | |
|---|---|
| `vtex_list_warehouses` · `vtex_get_warehouse` | |
| `vtex_create_warehouse` · `vtex_update_warehouse` · `vtex_delete_warehouse` | |
| `vtex_list_docks` · `vtex_get_dock` | |
| `vtex_create_dock` · `vtex_update_dock` · `vtex_delete_dock` | `update_dock` carries the policy and trade-policy links |

**Catalog** (17)

| Tool | |
|---|---|
| `vtex_list_products` · `vtex_get_product_full` | `get_product_full` is *the* way to read a product here |
| `vtex_create_product` · `vtex_update_product` | |
| `vtex_create_sku` · `vtex_update_sku` | SKUs are written through their product |
| `vtex_add_product_image` | Attach an **already-hosted** vtexassets image — no permission needed |
| `vtex_add_sku_image_by_url` · `vtex_add_sku_image_by_file` | Upload; needs `vtex.catalog-images` |
| `vtex_get_sku_images` · `vtex_delete_sku_image` | |
| `vtex_list_categories` · `vtex_create_category` | |
| `vtex_list_brands` · `vtex_create_brand` · `vtex_update_brand` | Deactivate with `IsActive: false`; brands cannot be deleted |
| `vtex_open_create_product_form` | Opens an interactive MCP App form |

**Pricing and stock** (4) — `vtex_get_sku_price` · `vtex_set_sku_price` ·
`vtex_get_sku_inventory` · `vtex_set_sku_inventory`

**Sellers** (5) — `vtex_list_sellers` · `vtex_get_seller` ·
`vtex_get_seller_commissions` · `vtex_upsert_seller_commissions` ·
`vtex_create_or_update_seller`

**Payments** (1) — `vtex_get_payment_data`

---

## Write tools and safety

Most tools mutate live VTEX data. Three properties are worth knowing before you
point an assistant at a production account.

**Actions verify their own outcome.** VTEX workflow writes propagate
asynchronously — an invoice notified at `10:35:36` landed on the order at
`10:35:42`. Order and logistics actions therefore re-read the record with
retries and report `applied` versus `accepted-pending`. On
`accepted-pending` the instruction is **re-read, never retry**: the action has
most likely succeeded and a retry could double-apply it.

**Updates are read-merge-write.** Nearly every write endpoint on these accounts
is a full replace that resets anything you leave out. The tools read the record
and merge your change, so omitted fields keep their value. See
[vtex-gotchas.md](./vtex-gotchas.md).

**Some tools cannot succeed on some accounts, and say so.** Their descriptions
name the missing permission rather than failing opaquely:

| Tool | Needs |
|---|---|
| `vtex_add_sku_image_by_url` / `_by_file` | `vtex.catalog-images` on the seller App Key |
| `vtex_get_seller_commissions` / `vtex_upsert_seller_commissions` | Seller Register resources on the marketplace key |
| `vtex_create_or_update_seller` | The route answers 404 on our account — likely not provisioned |

**Irreversible actions.** `vtex_invoice_order` cannot be undone: an invoiced
order cannot be cancelled without a return invoice. The tool refuses an
already-invoiced order before sending anything.

---

## Adding a tool

1. Write the VTEX wrapper in `lib/vtex/`. If it writes, make it read-merge-write
   and re-read afterwards.
2. Register it in the matching `lib/mcp/tools/*.ts` with a zod input schema.
3. Put the failure modes **in the description**. The description is the only
   documentation the model gets, so state what the tool cannot do and which tool
   to use instead.
4. Verify it against a live account, through the MCP route rather than the
   wrapper. Four tools in this repo passed type-checking and failed on every real
   call for months.
5. Deploy, then bump `&v=N` on the connector.

Descriptions are a shared budget: the full list is about 40 KB, roughly 10,000
tokens, sent on every session. A tool that cannot work on the target account is
worse than absent — a model may pick it over the one that does.
