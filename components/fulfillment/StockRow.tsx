"use client";

import { useActionState } from "react";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { updateStockAction } from "@/lib/actions/fulfillment";
import type { UpdateStockState } from "@/lib/actions/fulfillment";

interface StockRowProps {
  skuId: number;
  skuName: string;
  productName: string;
  warehouseId: string;
  warehouseName: string;
  totalQuantity: number;
  reservedQuantity: number;
}

export function StockRow({
  skuId,
  skuName,
  productName,
  warehouseId,
  warehouseName,
  totalQuantity,
  reservedQuantity,
}: StockRowProps) {
  const available = totalQuantity - reservedQuantity;
  const [state, formAction, isPending] = useActionState<UpdateStockState, FormData>(
    updateStockAction,
    {}
  );

  return (
    <tr className="hover:bg-zinc-50 transition-colors">
      {/* SKU info */}
      <td className="px-6 py-3.5">
        <p className="text-sm font-medium text-zinc-900 truncate max-w-[220px]" title={productName}>
          {productName}
        </p>
        <p className="text-xs text-zinc-400 font-mono mt-0.5">SKU #{skuId}</p>
      </td>

      {/* Warehouse */}
      <td className="px-4 py-3.5">
        <span className="text-xs text-zinc-500">{warehouseName}</span>
      </td>

      {/* Stock levels */}
      <td className="px-4 py-3.5 text-center">
        <span
          className={cn(
            "text-sm font-semibold",
            available === 0
              ? "text-red-500"
              : available < 10
              ? "text-amber-600"
              : "text-zinc-900"
          )}
        >
          {available}
        </span>
      </td>
      <td className="px-4 py-3.5 text-center text-sm text-zinc-500">
        {reservedQuantity}
      </td>
      <td className="px-4 py-3.5 text-center text-sm text-zinc-700">
        {totalQuantity}
      </td>

      {/* Update form */}
      <td className="px-6 py-3.5">
        <form action={formAction} className="flex items-center gap-2">
          <input type="hidden" name="skuId" value={skuId} />
          <input type="hidden" name="warehouseId" value={warehouseId} />
          <input
            name="quantity"
            type="number"
            min="0"
            defaultValue={totalQuantity}
            className="w-20 rounded border border-zinc-200 bg-white px-2 py-1 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
          <button
            type="submit"
            disabled={isPending}
            className="rounded bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Update"}
          </button>
          {state.success && (
            <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
          )}
          {state.error && (
            <span title={state.error}>
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            </span>
          )}
        </form>
      </td>
    </tr>
  );
}
