"use server";

import { createOrUpdateSeller } from "@/lib/vtex/sellers";
import type { VtexSellerPayload } from "@/lib/vtex/sellers";
import type { LegalInfo } from "@/lib/types/onboarding";

export interface CreateSellerState {
  error?: string;
  success?: boolean;
  sellerId?: string;
}

/**
 * Server action — called at Step 5 of the onboarding wizard.
 * Creates the seller in the marketplace via POST /seller-register/pvt/sellers.
 */
export async function createSellerAction(
  _prev: CreateSellerState,
  formData: FormData
): Promise<CreateSellerState> {
  const sellerId = String(formData.get("sellerId") ?? "").trim();
  const sellerAccount = String(formData.get("sellerAccount") ?? "").trim();
  const sellerName = String(formData.get("sellerName") ?? "").trim();
  const sellerEmail = String(formData.get("sellerEmail") ?? "").trim();
  const taxCode = String(formData.get("taxCode") ?? "").trim();

  if (!sellerId) return { error: "Seller ID is required" };
  if (!sellerAccount) return { error: "Seller account is required" };
  if (!sellerName) return { error: "Company name is required" };
  if (!sellerEmail) return { error: "Email is required" };

  const env = process.env.VTEX_ENVIRONMENT ?? "vtexcommercestable";

  const payload: VtexSellerPayload = {
    id: sellerId,
    name: sellerName,
    email: sellerEmail,
    isActive: true,
    isVtex: true,
    sellerType: 1,
    account: sellerAccount,
    taxCode: taxCode || undefined,
    fulfillmentEndpoint: `https://${sellerAccount}.${env}.com.br/api/fulfillment?sc=1`,
    catalogSystemEndpoint: `https://${sellerAccount}.${env}.com.br/api/catalog_system/`,
    allowHybridPayments: false,
    isBetterScope: true,
    trustPolicy: "Default",
    sellerCommissionConfiguration: {
      productCommissionPercentage: 12,
      freightCommissionPercentage: 0,
    },
  };

  try {
    await createOrUpdateSeller(payload);
    return { success: true, sellerId };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[createSellerAction] failed:", msg);
    return { error: `Failed to create seller: ${msg}` };
  }
}

