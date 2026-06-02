"use client";

import { useActionState } from "react";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { updateSkuPriceAction, updateSkuInventoryAction } from "@/lib/actions/catalog";
import type {
  UpdateSkuPriceState,
  UpdateSkuInventoryState,
} from "@/lib/actions/catalog";
import type { VtexSku, VtexPrice, VtexInventoryBalance } from "@/lib/types/catalog";
import { cn } from "@/lib/utils";

interface SkuDetailRowProps {
  sku: VtexSku;
  price: VtexPrice | null;
  inventory: VtexInventoryBalance[];
  productId: number;
}

function StatusIcon({
  state,
}: {
  state: { error?: string; success?: boolean };
}) {
  if (state.success) return <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />;
  if (state.error) return (
    <span title={state.error}>
      <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
    </span>
  );
  return null;
}

export function SkuDetailRow({ sku, price, inventory, productId }: SkuDetailRowProps) {
  const [priceState, priceAction, priceIsPending] = useActionState<UpdateSkuPriceState, FormData>(
    updateSkuPriceAction,
    {}
  );

  const totalStock = inventory.reduce((s, b) => s + b.totalQuantity, 0);
  const reservedStock = inventory.reduce((s, b) => s + b.reservedQuantity, 0);
  const availableStock = totalStock - reservedStock;

  return (
    <div className="bg-white rounded-lg border border-zinc-200 p-4">
      {/* SKU header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-semibold text-zinc-800">{sku.Name}</p>
          <p className="text-xs text-zinc-400 font-mono mt-0.5">
            SKU #{sku.Id}
            {sku.RefId ? ` · ${sku.RefId}` : ""}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
            sku.IsActive ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
          )}
        >
          {sku.IsActive ? "Active" : "Inactive"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Price section */}
        <div className="rounded-lg bg-zinc-50 p-3 border border-zinc-100">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">
            Pricing
          </p>
          <form action={priceAction} className="space-y-2">
            <input type="hidden" name="skuId" value={sku.Id} />
            <input type="hidden" name="productId" value={productId} />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Base price (€)</label>
                <input
                  name="basePrice"
                  type="number"
                  step="0.01"
                  min="0.01"
                  defaultValue={price?.basePrice ?? ""}
                  placeholder="0.00"
                  className="w-full rounded border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">List price (€)</label>
                <input
                  name="listPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={price?.listPrice ?? ""}
                  placeholder="0.00"
                  className="w-full rounded border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={priceIsPending}
                className="rounded bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {priceIsPending ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  "Save price"
                )}
              </button>
              <StatusIcon state={priceState} />
            </div>
          </form>
        </div>

        {/* Inventory section */}
        <div className="rounded-lg bg-zinc-50 p-3 border border-zinc-100">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">
            Inventory
          </p>
          {inventory.length === 0 ? (
            <p className="text-xs text-zinc-400">No warehouses configured</p>
          ) : (
            <div className="space-y-2">
              {inventory.map((balance) => (
                <InventoryBalanceRow
                  key={balance.warehouseId}
                  balance={balance}
                  skuId={sku.Id}
                  productId={productId}
                />
              ))}
              {/* Summary */}
              <div className="flex items-center gap-3 pt-2 border-t border-zinc-200 text-xs text-zinc-500">
                <span>
                  Available:{" "}
                  <span
                    className={cn(
                      "font-semibold",
                      availableStock === 0
                        ? "text-red-500"
                        : availableStock < 5
                        ? "text-amber-600"
                        : "text-zinc-700"
                    )}
                  >
                    {availableStock}
                  </span>
                </span>
                <span>Reserved: <span className="font-semibold text-zinc-700">{reservedStock}</span></span>
                <span>Total: <span className="font-semibold text-zinc-700">{totalStock}</span></span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dimensions */}
      <div className="mt-3 flex items-center gap-4 text-xs text-zinc-400">
        <span>Weight: {sku.PackagedWeightKg} kg</span>
        <span>·</span>
        <span>
          {sku.PackagedHeight} × {sku.PackagedWidth} × {sku.PackagedLength} cm
        </span>
      </div>
    </div>
  );
}

function InventoryBalanceRow({
  balance,
  skuId,
  productId,
}: {
  balance: VtexInventoryBalance;
  skuId: number;
  productId: number;
}) {
  const [state, formAction, isPending] = useActionState<UpdateSkuInventoryState, FormData>(
    updateSkuInventoryAction,
    {}
  );

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="skuId" value={skuId} />
      <input type="hidden" name="warehouseId" value={balance.warehouseId} />
      <input type="hidden" name="productId" value={productId} />
      <span className="text-xs text-zinc-600 truncate flex-1" title={balance.warehouseName}>
        {balance.warehouseName}
      </span>
      <input
        name="quantity"
        type="number"
        min="0"
        defaultValue={balance.totalQuantity}
        className="w-16 rounded border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition text-center"
      />
      <button
        type="submit"
        disabled={isPending}
        className="rounded bg-zinc-700 px-2 py-1 text-xs font-medium text-white hover:bg-zinc-800 transition-colors disabled:opacity-50"
      >
        {isPending ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : "Set"}
      </button>
      {state.success && <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />}
      {state.error && (
        <span title={state.error}>
          <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
        </span>
      )}
    </form>
  );
}
