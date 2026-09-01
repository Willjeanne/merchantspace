import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/server";
import {
  createOrUpdateSeller,
  getSellerCommissions,
  upsertSellerCommissions,
} from "@/lib/vtex/sellers";
import { safe } from "../utils";

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
        "GET /seller-register/pvt/sellers/{sellerId}/commissions — all category-level commission rates configured for a seller.",
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
