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
 *
 * Errors are deliberately NOT swallowed. This used to `catch { return [] }`,
 * which turned a missing License Manager resource into "this seller has no
 * commissions" — the caller could not tell an empty configuration from an
 * absent permission. On franceretail every `GET /seller-register/pvt/*`
 * currently answers 302 towards the Admin login, so this throws until the
 * marketplace key is granted the Seller Register resource.
 *
 * For account-level rates that work today, see `listSellers()`.
 */
export async function getSellerCommissions(sellerId: string): Promise<SellerCommission[]> {
  const result = await vtexFetch<SellerCommission[]>(
    `/seller-register/pvt/sellers/${encodeURIComponent(sellerId)}/commissions`
  );
  return Array.isArray(result) ? result : [];
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

// ─── Catalog System seller list ───────────────────────────────────────────────
//
// The Seller Register API (`/seller-register/pvt/*`) is the modern surface, but
// it needs a License Manager resource the marketplace key does not have yet —
// every GET there answers 302 towards the Admin login. The older Catalog System
// endpoints below work with the current key (verified 200 on franceretail) and
// already carry the account-level commission rates, so they cover reading
// sellers without waiting on a permission grant.

/** Seller as returned by `/api/catalog_system/pvt/seller/*` (PascalCase, legacy shape). */
export interface VtexCatalogSeller {
  SellerId: string;
  Name: string;
  Email: string | null;
  Description: string | null;
  IsActive: boolean;
  IsBetterScope: boolean;
  /** Account-level product commission, in percent. */
  ProductCommissionPercentage: number;
  /** Account-level freight commission, in percent. */
  FreightCommissionPercentage: number;
  CategoryCommissionPercentage: number;
  FulfillmentEndpoint: string | null;
  CatalogSystemEndpoint: string | null;
  FulfillmentSellerId: string | null;
  SellerType: number | null;
  MerchantName: string | null;
  CNPJ: string | null;
  UrlLogo: string;
  trustPolicy: string | null;
}

/**
 * GET /api/catalog_system/pvt/seller/list
 * Every seller registered on the marketplace account, with their account-level
 * commission rates.
 */
export async function listSellers(): Promise<VtexCatalogSeller[]> {
  const result = await vtexFetch<VtexCatalogSeller[]>(
    "/api/catalog_system/pvt/seller/list"
  );
  return Array.isArray(result) ? result : [];
}

/**
 * GET /api/catalog_system/pvt/seller/{sellerId}
 * A single seller's registration record on the marketplace account.
 */
export async function getSeller(sellerId: string): Promise<VtexCatalogSeller> {
  return vtexFetch<VtexCatalogSeller>(
    `/api/catalog_system/pvt/seller/${encodeURIComponent(sellerId)}`
  );
}
