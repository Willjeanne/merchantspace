import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/server";
import {
  createOrUpdateSeller,
  getSellerCommissions,
  upsertSellerCommissions,
  listSellers,
  getSeller,
} from "@/lib/vtex/sellers";
import { safe, safeNoArgs } from "../utils";

const sellerPayload = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  description: z.string().optional(),
  isActive: z.boolean(),
  isVtex: z.boolean(),
  sellerType: z.union([z.literal(1), z.literal(2)]).describe("1 = Reseller, 2 = Marketplace"),
  account: z.string(),
  taxCode: z.string().optional(),
  fulfillmentEndpoint: z.string(),
  catalogSystemEndpoint: z.string(),
  allowHybridPayments: z.boolean(),
  isBetterScope: z.boolean(),
  trustPolicy: z.enum(["Default", "AllowEmailSharing"]),
  sellerCommissionConfiguration: z
    .object({
      productCommissionPercentage: z.number(),
      freightCommissionPercentage: z.number(),
    })
    .optional(),
});

const commissionLine = z.object({
  categoryId: z.string(),
  categoryFullPath: z.string(),
  productCommissionPercentage: z.number(),
  freightCommissionPercentage: z.number(),
});

export function registerSellerTools(server: McpServer) {
  server.registerTool(
    "vtex_list_sellers",
    {
      title: "List sellers",
      description:
        "GET /api/catalog_system/pvt/seller/list — every seller registered on the marketplace account, with their account-level ProductCommissionPercentage and FreightCommissionPercentage. Works with the current App Key. Prefer this over vtex_get_seller_commissions for commission rates: that one reads the Seller Register API, which needs a permission this key does not have yet, and only adds per-category overrides.",
    },
    safeNoArgs(listSellers)
  );

  server.registerTool(
    "vtex_get_seller",
    {
      title: "Get seller",
      description:
        "GET /api/catalog_system/pvt/seller/{sellerId} — one seller's registration record on the marketplace account: status, commissions, fulfillment and catalog endpoints, seller type.",
      inputSchema: z.object({
        sellerId: z.string().describe('Seller id, e.g. "franceretailer1388"'),
      }),
    },
    safe(({ sellerId }) => getSeller(sellerId))
  );

  server.registerTool(
    "vtex_create_or_update_seller",
    {
      title: "Create or update seller",
      description:
        "POST /seller-register/pvt/sellers — registers or updates a seller in the marketplace account via the Seller Register API. Uses marketplace credentials.",
      inputSchema: sellerPayload,
    },
    safe(createOrUpdateSeller)
  );

  server.registerTool(
    "vtex_get_seller_commissions",
    {
      title: "Get seller category commissions",
      description:
        "GET /seller-register/pvt/sellers/{sellerId}/commissions — the per-CATEGORY commission overrides for a seller. Note: on this account the Seller Register API is not yet authorised for the marketplace App Key and every read there fails with a permission error — that is expected and must be reported as such, never as 'this seller has no commissions'. For account-level rates that do work, use vtex_list_sellers or vtex_get_seller.",
      inputSchema: z.object({ sellerId: z.string() }),
    },
    safe(({ sellerId }) => getSellerCommissions(sellerId))
  );

  server.registerTool(
    "vtex_upsert_seller_commissions",
    {
      title: "Upsert seller category commissions",
      description:
        "PUT /seller-register/pvt/sellers/{sellerId}/commissions — bulk create/update category-level commission rates for a seller.",
      inputSchema: z.object({
        sellerId: z.string(),
        commissions: z.array(commissionLine),
      }),
    },
    safe(({ sellerId, commissions }) => upsertSellerCommissions(sellerId, commissions))
  );
}
