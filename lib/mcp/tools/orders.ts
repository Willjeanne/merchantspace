import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/server";
import {
  listOrders,
  listOrdersMarketplace,
  getOrder,
  listSellerOrders,
  getSellerOrder,
  startHandlingSellerOrder,
  invoiceSellerOrder,
} from "@/lib/vtex/orders";
import { safe } from "../utils";

const ORDER_STATUS = z.enum([
  "waiting-for-sellers-confirmation",
  "payment-pending",
  "payment-approved",
  "ready-for-handling",
  "handling",
  "invoiced",
  "canceled",
  "window-to-cancel",
]);

const listOrdersInput = z.object({
  q: z.string().optional().describe("Full-text search query"),
  status: ORDER_STATUS.optional(),
  page: z.number().int().min(1).optional(),
  perPage: z.number().int().min(1).max(100).optional(),
  orderBy: z.string().optional().describe('e.g. "creationDate,desc"'),
});

/**
 * Same shape as listOrdersInput, but `status` stays a free-form string: the
 * seller account's OMS uses its own status vocabulary (`waiting-seller-handling`
 * is not one of ORDER_STATUS), and VTEX documents that unknown statuses must be
 * tolerated rather than rejected. A closed enum here would reject valid filters.
 */
const sellerListOrdersInput = listOrdersInput.extend({
  status: z
    .string()
    .optional()
    .describe(
      'Seller-side status, e.g. "waiting-seller-handling", "handling", "invoiced", "canceled"'
    ),
});

export function registerOrderTools(server: McpServer) {
  server.registerTool(
    "vtex_list_orders",
    {
      title: "List seller orders",
      description:
        "GET /api/oms/pvt/orders — lists orders in the MARKETPLACE account, filtered to the configured seller (VTEX_SELLER_ID). Read-only view: the orderIds it returns are marketplace-side ids and the order action tools will reject them. To act on an order, use vtex_list_seller_orders instead.",
      inputSchema: listOrdersInput,
    },
    safe(listOrders)
  );

  server.registerTool(
    "vtex_list_orders_marketplace",
    {
      title: "List all marketplace orders",
      description:
        "GET /api/oms/pvt/orders — lists orders across the whole MARKETPLACE account, with no seller filter. Used for marketplace-wide KPIs. Its orderIds are not actionable — see vtex_list_seller_orders.",
      inputSchema: listOrdersInput,
    },
    safe(listOrdersMarketplace)
  );

  server.registerTool(
    "vtex_get_order",
    {
      title: "Get order detail",
      description:
        "GET /api/oms/pvt/orders/{orderId} — full order detail from the MARKETPLACE account: items, totals, shipping and payment data. Takes a marketplace orderId (from vtex_list_orders).",
      inputSchema: z.object({ orderId: z.string() }),
    },
    safe(({ orderId }) => getOrder(orderId))
  );

  // ─── Seller-account OMS (the actionable surface) ────────────────────────

  server.registerTool(
    "vtex_list_seller_orders",
    {
      title: "List orders on the seller account",
      description:
        "GET /api/oms/pvt/orders on the SELLER account — the fulfillment-side view of the seller's orders. This is the list to use before acting on an order: its orderIds (e.g. `FRN-1636850500005-01`) are the ones the order action tools accept. Statuses come from the seller vocabulary and differ from the marketplace one — expect values like `waiting-seller-handling`, `handling`, `invoiced`, `canceled`. Note this endpoint reads the order index, which lags a few seconds behind a status change; read back a single order with vtex_get_seller_order for an immediate view.",
      inputSchema: sellerListOrdersInput,
    },
    safe(listSellerOrders)
  );

  server.registerTool(
    "vtex_get_seller_order",
    {
      title: "Get seller-account order detail",
      description:
        "GET /api/oms/pvt/orders/{orderId} on the SELLER account — full detail of a fulfillment-side order. Includes `allowCancellation` and `allowEdition`, which state whether VTEX will currently accept a cancellation or an edit: check them before attempting either. Does not read the order index, so it reflects a status change immediately.",
      inputSchema: z.object({
        orderId: z.string().describe("Seller-account order id, e.g. FRN-1636850500005-01"),
      }),
    },
    safe(({ orderId }) => getSellerOrder(orderId))
  );

  server.registerTool(
    "vtex_start_handling_order",
    {
      title: "Start handling order",
      description:
        "POST /api/oms/pvt/orders/{orderId}/start-handling on the SELLER account — asks the OMS to move an order into `handling`. Takes a seller-account orderId (from vtex_list_seller_orders); a marketplace orderId returns 404. IMPORTANT: VTEX answers 2xx even when the workflow does not move, so this tool re-reads the order and returns `ok: false` plus a `message` when nothing changed — report that as a failure, not a success. Verified no-op case: a chain order already past `authorizedDate` is awaiting dispatch (invoice), not handling.",
      inputSchema: z.object({
        orderId: z.string().describe("Seller-account order id, e.g. FRN-1636850500005-01"),
      }),
    },
    safe(({ orderId }) => startHandlingSellerOrder(orderId))
  );

  server.registerTool(
    "vtex_invoice_order",
    {
      title: "Invoice (dispatch) order",
      description:
        "POST /api/oms/pvt/orders/{orderId}/invoice on the SELLER account — notifies the invoice for a whole order, which is how a seller DISPATCHES it. On this account this is the action that moves an order out of `waiting-seller-handling`; vtex_start_handling_order is refused there with OMS003 because it needs `ready-for-handling`. Everything is derived from the order itself — items, total in cents, issuance date and invoice number — so pass only the orderId. IRREVERSIBLE: an invoiced order can no longer be cancelled without a return invoice, and an already-invoiced order is refused rather than re-notified. The OMS applies the transition asynchronously (measured ~6s), so the tool polls for it; `outcome: \"accepted-pending\"` means VTEX took the invoice but the status had not flipped yet — NEVER call this tool again in that case, re-read with vtex_get_seller_order instead.",
      inputSchema: z.object({
        orderId: z.string().describe("Seller-account order id, e.g. FRN-1636850500005-01"),
        invoiceNumber: z
          .string()
          .optional()
          .describe("Override the generated invoice number. Leave unset unless the user gave one."),
      }),
    },
    safe(({ orderId, invoiceNumber }) => invoiceSellerOrder(orderId, { invoiceNumber }))
  );
}
