"use client";

import { useActionState } from "react";
import { Plus, Loader2, CheckCircle2 } from "lucide-react";
import { createWarehouseAction } from "@/lib/actions/fulfillment";
import type { WarehouseActionState } from "@/lib/actions/fulfillment";

interface CreateWarehouseFormProps {
  onCancel: () => void;
}

export function CreateWarehouseForm({ onCancel }: CreateWarehouseFormProps) {
  const [state, formAction, isPending] = useActionState<WarehouseActionState, FormData>(
    createWarehouseAction,
    {}
  );

  return (
    <form
      action={formAction}
      className="bg-white rounded-lg border border-indigo-200 p-5 space-y-3"
    >
      <h3 className="text-sm font-semibold text-zinc-700">New Warehouse</h3>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-1">
            Warehouse ID <span className="text-red-500">*</span>
          </label>
          <input
            name="id"
            type="text"
            required
            placeholder="e.g. warehouse-paris"
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
          <p className="text-xs text-zinc-400 mt-1">Lowercase letters, numbers, hyphens</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-1">
            Warehouse Name <span className="text-red-500">*</span>
          </label>
          <input
            name="name"
            type="text"
            required
            placeholder="e.g. Paris Main Warehouse"
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Plus className="w-3.5 h-3.5" />
          )}
          Create Warehouse
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
        >
          Cancel
        </button>
        {state.success && <CheckCircle2 className="w-4 h-4 text-green-500" />}
        {state.error && (
          <p className="text-sm text-red-600">{state.error}</p>
        )}
      </div>
    </form>
  );
}
