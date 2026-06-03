import { PageHeader } from "@/components/layout/PageHeader";
import { WarehousesSection } from "@/components/fulfillment/WarehousesSection";
import { DocksSection } from "@/components/fulfillment/DocksSection";
import { StockRow } from "@/components/fulfillment/StockRow";
import {
  getSellerWarehouses,
  getSkuInventory,
  listSellerProducts,
  getSellerDocks,
  getShippingPolicies,
} from "@/lib/vtex/catalog";
import { vtexSellerFetch } from "@/lib/vtex/client";
import { Truck, CheckCircle2, XCircle } from "lucide-react";

interface VtexSkuById {
  Id: number;
  ProductId: number;
  ProductName: string;
  SkuName: string;
}

export default async function FulfillmentPage() {
  const [warehouses, products, docks, carriers] = await Promise.all([
    getSellerWarehouses().catch(() => []),
    listSellerProducts({ from: 0, to: 49 }).catch(() => []),
    getSellerDocks().catch(() => []),
    getShippingPolicies().catch(() => []),
  ]);

  // Build stock rows: for each product's first SKU, fetch inventory
  const stockRows = await Promise.all(
    products.map(async (p) => {
      const skuId = p.firstSkuId;
      const [sku, balances] = await Promise.all([
        vtexSellerFetch<VtexSkuById>(
          `/api/catalog_system/pvt/sku/stockKeepingUnitById/${skuId}`
        ).catch(() => null),
        getSkuInventory(String(skuId)),
      ]);

      return balances.map((b) => ({
        skuId,
        skuName: sku?.SkuName ?? `SKU #${skuId}`,
        productName: p.name,
        warehouseId: b.warehouseId,
        warehouseName: b.warehouseName,
        totalQuantity: b.totalQuantity,
        reservedQuantity: b.reservedQuantity,
      }));
    })
  );

  const flatStockRows = stockRows.flat();
  const totalStock = flatStockRows.reduce((s, r) => s + r.totalQuantity, 0);
  const outOfStock = flatStockRows.filter(
    (r) => r.totalQuantity - r.reservedQuantity === 0
  ).length;

  return (
    <>
      <PageHeader
        title="Fulfillment"
        description="Warehouses, docks, inventory levels and shipping policies"
      />

      {/* Warehouses */}
      <WarehousesSection warehouses={warehouses} />

      {/* Docks */}
      <DocksSection docks={docks} />

      {/* Shipping Policies */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-3">
          Shipping Policies ({carriers.length})
        </h2>
        {carriers.length === 0 ? (
          <div className="rounded-lg border border-zinc-200 bg-white px-6 py-8 text-center text-sm text-zinc-400">
            <Truck className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
            <p>No shipping policies configured.</p>
            <p className="text-xs mt-1">
              Create shipping policies in{" "}
              <a
                href={`https://${process.env.VTEX_SELLER_ACCOUNT ?? process.env.VTEX_SELLER_ID ?? ""}.myvtex.com/admin/logistics#/shipping-policies`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:underline"
              >
                VTEX Admin → Logistics → Shipping Policies
              </a>
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-zinc-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-100">
                  <th className="text-left px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                    Carrier / Policy
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                    Type
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                    ID
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {carriers.map((carrier) => (
                  <tr key={carrier.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-6 py-3.5">
                      <p className="font-medium text-zinc-900">{carrier.name}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs bg-zinc-100 text-zinc-600 rounded px-2 py-0.5 font-mono">
                        {carrier.slaType || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {carrier.isActive ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-700">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-zinc-400">
                          <XCircle className="w-3.5 h-3.5" />
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <span className="text-xs text-zinc-400 font-mono">{carrier.id}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Inventory */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">
            Stock Overview
          </h2>
          <div className="flex items-center gap-4 text-xs text-zinc-500">
            <span>
              Total units:{" "}
              <span className="font-semibold text-zinc-800">{totalStock}</span>
            </span>
            {outOfStock > 0 && (
              <span className="text-red-500 font-medium">
                {outOfStock} SKU{outOfStock !== 1 ? "s" : ""} out of stock
              </span>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-zinc-200 overflow-hidden">
          {flatStockRows.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-zinc-400">
              No inventory data available. Create products and configure a warehouse.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-100">
                    <th className="text-left px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                      Product / SKU
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                      Warehouse
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                      Available
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                      Reserved
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                      Total
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                      Update Stock
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {flatStockRows.map((row, i) => (
                    <StockRow key={`${row.skuId}-${row.warehouseId}-${i}`} {...row} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
