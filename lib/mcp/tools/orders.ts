import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/server";
import { listOrders, listOrdersMarketplace, getOrder } from "@/lib/vtex/orders";
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

export function registerOrderTools(server: McpServer) {
  server.registerTool(
    "vtex_list_orders",
    {
      title: "List seller orders",
      description:
        "GET /api/oms/pvt/orders — lists orders in the marketplace account, filtered to the configured seller (VTEX_SELLER_ID).",
      inputSchema: listOrdersInput,
    },
    safe(listOrders)
  );

  server.registerTool(
    "vtex_list_orders_marketplace",
    {
      title: "List all marketplace orders",
      description:
        "GET /api/oms/pvt/orders — lists orders across the whole marketplace account, with no seller filter. Used for marketplace-wide KPIs.",
      inputSchema: listOrdersInput,
    },
    safe(listOrdersMarketplace)
  );

  server.registerTool(
    "vtex_get_order",
    {
      title: "Get order detail",
      description:
        "GET /api/oms/pvt/orders/{orderId} — full order detail: items, totals, shipping and payment data.",
      inputSchema: z.object({ orderId: z.string() }),
    },
    safe(({ orderId }) => getOrder(orderId))
  );
}
