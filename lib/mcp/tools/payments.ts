import type { McpServer } from "@modelcontextprotocol/server";
import { fetchPaymentData } from "@/lib/vtex/payments";
import { safeNoArgs } from "../utils";

export function registerPaymentTools(server: McpServer) {
  server.registerTool(
    "vtex_get_payment_data",
    {
      title: "Get derived payment / payout data",
      description:
        "Fetches the seller's last 100 non-canceled orders (GET /api/oms/pvt/orders) and derives wallet balance, order splits (commission + PSP fee), the payout calendar, a reconciliation table, and DAC7 threshold tracking. Commission rate 1.15%, PSP fee 0.2%, EU 14-day retraction hold.",
    },
    safeNoArgs(fetchPaymentData)
  );
}
