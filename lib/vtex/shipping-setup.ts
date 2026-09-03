import { vtexSellerFetch } from "@/lib/vtex/client";
import { getSellerDocks, getSellerWarehouses } from "@/lib/vtex/catalog";
import { getShippingPolicy } from "@/lib/vtex/shipping-policies";
import { listFreightTables, getFreightRates } from "@/lib/vtex/freight-rates";

/**
 * The shipping chain, and how to tell whether it is actually complete.
 *
 * A shipping policy only produces a quote when every link below exists. Each
 * link lives on a different object, and none of them is visible from the policy
 * itself — which is why a policy can look perfectly configured and still never
 * appear at checkout.
 *
 *   warehouse.warehouseDocks[].dockId  →  dock          (stock reaches a dock)
 *   dock.freightTableIds               →  policy        (dock serves the policy)
 *   dock.salesChannels                 →  trade policy  (dock sells on a channel)
 *   freight table rows for the policy                   (there is a price)
 */

export interface VtexTradePolicy {
  Id: number;
  Name: string;
  IsActive: boolean;
  CountryCode: string;
  CurrencyCode: string;
}

export interface ShippingSetupReport {
  policyId: string;
  policyName: string;
  policyIsActive: boolean;
  /** True only when nothing is listed in `missing`. */
  ready: boolean;
  /** Plain statements of what is absent, in the order worth fixing. */
  missing: string[];
  docks: Array<{
    id: string;
    name: string;
    isActive: boolean;
    tradePolicyIds: string[];
    warehouseIds: string[];
  }>;
  freightTable: {
    hasError: boolean;
    /** VTEX's own wording, e.g. "No files to proccess...". */
    error: string | null;
    processStatus: number | null;
  };
  /**
   * Only present when a postal code was given. `hasError: null` says the table
   * loaded; this says whether THAT address actually gets a price, which is the
   * question a demo really asks.
   */
  quoteProbe?: {
    postalCode: string;
    rateCount: number;
    prices: number[];
  };
}

/**
 * GET /api/catalog_system/pvt/saleschannel/list
 * The account's trade policies (sales channels). A dock is attached to one
 * through `dock.salesChannels`.
 */
export async function listTradePolicies(): Promise<VtexTradePolicy[]> {
  const raw = await vtexSellerFetch<VtexTradePolicy[]>(
    "/api/catalog_system/pvt/saleschannel/list"
  );
  return (Array.isArray(raw) ? raw : []).map((t) => ({
    Id: t.Id,
    Name: t.Name,
    IsActive: t.IsActive,
    CountryCode: t.CountryCode,
    CurrencyCode: t.CurrencyCode,
  }));
}

/**
 * Walks the chain for one shipping policy and reports what is missing.
 *
 * Composed entirely of reads, so it is safe to run at any time. It answers the
 * question that took four separate calls to answer by hand: "why does this
 * policy not show up in shipping simulation?"
 */
export async function checkShippingSetup(
  policyId: string,
  postalCode?: string
): Promise<ShippingSetupReport> {
  const [policy, allDocks, allWarehouses, freightTables] = await Promise.all([
    getShippingPolicy(policyId),
    getSellerDocks(),
    getSellerWarehouses(),
    listFreightTables(),
  ]);

  const serving = allDocks.filter((d) => (d.freightTableIds ?? []).includes(policyId));

  const docks = serving.map((d) => ({
    id: d.id,
    name: d.name,
    isActive: d.isActive,
    tradePolicyIds: d.salesChannels ?? [],
    warehouseIds: allWarehouses
      .filter((w) => (w.warehouseDocks ?? []).some((wd) => wd.dockId === d.id))
      .map((w) => w.id),
  }));

  const table = freightTables.find((t) => t.id === policyId);
  const freightTable = {
    hasError: Boolean(table?.freightTableValueError),
    error: table?.freightTableValueError ?? null,
    processStatus: table?.freightTableProcessStatus ?? null,
  };

  const probe = postalCode ? await getFreightRates(policyId, postalCode) : undefined;

  const missing: string[] = [];

  if (!policy.isActive) {
    missing.push(`Policy "${policy.name}" is inactive.`);
  }
  if (!docks.length) {
    missing.push(
      `No dock serves this policy. The link lives on the dock, in freightTableIds — ` +
        `add "${policyId}" there with vtex_update_dock, passing the full list you want.`
    );
  }
  if (docks.length && !docks.some((d) => d.isActive)) {
    missing.push("Every dock serving this policy is inactive.");
  }
  if (docks.length && !docks.some((d) => d.warehouseIds.length)) {
    missing.push(
      "No warehouse reaches any of these docks, so there is no stock behind the policy."
    );
  }
  if (docks.length && !docks.some((d) => d.tradePolicyIds.length)) {
    missing.push(
      "No trade policy on these docks — set salesChannels with vtex_update_dock."
    );
  }
  if (freightTable.hasError) {
    missing.push(
      `Freight table not loaded: ${freightTable.error}. Add rates with ` +
        `vtex_set_freight_rates — without them the policy quotes no price.`
    );
  }
  if (probe && !probe.length) {
    missing.push(
      `No rate covers postal code ${postalCode}, so this address gets no price ` +
        `even though the table itself loaded. Add a row spanning it with ` +
        `vtex_set_freight_rates.`
    );
  }

  return {
    policyId,
    policyName: policy.name,
    policyIsActive: policy.isActive,
    ready: missing.length === 0,
    missing,
    docks,
    freightTable,
    ...(probe
      ? {
          quoteProbe: {
            postalCode: postalCode as string,
            rateCount: probe.length,
            prices: probe.map((r) => r.absoluteMoneyCost),
          },
        }
      : {}),
  };
}
