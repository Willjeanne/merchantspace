import type { McpServer } from "@modelcontextprotocol/server";
import { registerOrderTools } from "./tools/orders";
import { registerCatalogTools } from "./tools/catalog";
import { registerPaymentTools } from "./tools/payments";
import { registerSellerTools } from "./tools/sellers";

/**
 * Registers one MCP tool per exported function in lib/vtex/{catalog,orders,payments,sellers}.ts
 * — a near 1:1 mapping onto the VTEX Seller Portal APIs this app already wraps.
 */
export function registerVtexTools(server: McpServer) {
  registerOrderTools(server);
  registerCatalogTools(server);
  registerPaymentTools(server);
  registerSellerTools(server);
}
