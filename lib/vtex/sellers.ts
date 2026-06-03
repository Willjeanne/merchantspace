import { vtexFetch } from "@/lib/vtex/client";
import type { SellerCommission } from "@/lib/types/payments";

// ─── Seller register API ──────────────────────────────────────────────────────

export interface VtexSellerPayload {
  id: string;
  name: string;
  email: string;
  description?: string;
  isActive: boolean;
  isVtex: boolean;
  sellerType: 1 | 2;
  account: string;
  taxCode?: string;
  fulfillmentEndpoint: string;
  catalogSystemEndpoint: string;
  allowHybridPayments: boolean;
  isBetterScope: boolean;
  trustPolicy: "Default" | "AllowEmailSharing";
  sellerCommissionConfiguration?: {
    productCommissionPercentage: number;
    freightCommissionPercentage: number;
  };
}

/**
 * Create or update a seller in the marketplace via the Seller Register API.
 * Uses marketplace credentials (vtexFetch).
 */
export async function createOrUpdateSeller(payload: VtexSellerPayload): Promise<void> {
  const env = process.env.VTEX_ENVIRONMENT ?? "vtexcommercestable";
  await vtexFetch<unknown>("/seller-register/pvt/sellers", {
    method: "POST",
    body: JSON.stringify({
      ...payload,
      fulfillmentEndpoint:
        payload.fulfillmentEndpoint ||
        `https://${payload.account}.${env}.com.br/api/fulfillment?sc=1`,
      catalogSystemEndpoint:
        payload.catalogSystemEndpoint ||
        `https://${payload.account}.${env}.com.br/api/catalog_system/`,
    }),
  });
}

/**
 * Get all category-level commissions for a seller.
 */
export async function getSellerCommissions(sellerId: string): Promise<SellerCommission[]> {
  try {
    const result = await vtexFetch<SellerCommission[]>(
      `/seller-register/pvt/sellers/${encodeURIComponent(sellerId)}/commissions`
    );
    return Array.isArray(result) ? result : [];
  } catch {
    return [];
  }
}

/**
 * Upsert commissions for multiple categories in bulk.
 */
export async function upsertSellerCommissions(
  sellerId: string,
  commissions: SellerCommission[]
): Promise<void> {
  await vtexFetch<unknown>(
    `/seller-register/pvt/sellers/${encodeURIComponent(sellerId)}/commissions`,
    {
      method: "PUT",
      body: JSON.stringify(commissions),
    }
  );
}
