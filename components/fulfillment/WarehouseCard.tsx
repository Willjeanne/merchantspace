"use client";

import { useActionState, useState } from "react";
import { Warehouse, CheckCircle2, Pencil, Trash2, Loader2, AlertCircle } from "lucide-react";
import { updateWarehouseAction, deleteWarehouseAction } from "@/lib/actions/fulfillment";
import type { WarehouseActionState } from "@/lib/actions/fulfillment";
import type { VtexWarehouse } from "@/lib/types/catalog";

interface WarehouseCardProps {
  warehouse: VtexWarehouse;
}

export function WarehouseCard({ warehouse }: WarehouseCardProps) {
  const [editing, setEditing] = useState(false);
  const [editState, editAction, editPending] = useActionState<WarehouseActionState, FormData>(
    updateWarehouseAction,
    {}
  );
  const [deleteState, deleteAction, deletePending] = useActionState<WarehouseActionState, FormData>(
    deleteWarehouseAction,
    {}
  );

  if (editing) {
    return (
      <div className="bg-white rounded-lg border border-indigo-200 p-5">
        <form action={editAction} className="space-y-3">
          <input type="hidden" name="id" value={warehouse.id} />
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">
              Warehouse Name
            </label>
            <input
              name="name"
              type="text"
              required
              defaultValue={warehouse.name}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={editPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {editPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-lg border border-zinc-200 px-4 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
            >
              Cancel
            </button>
            {editState.error && <p className="text-xs text-red-600 self-center">{editState.error}</p>}
            {editState.success && <CheckCircle2 className="w-4 h-4 text-green-500 self-center" />}
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-zinc-200 p-5 flex items-start gap-4">
      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-50 shrink-0">
        <Warehouse className="w-5 h-5 text-indigo-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-zinc-800">{warehouse.name}</p>
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
            <CheckCircle2 className="w-3 h-3" />
            Active
          </span>
        </div>
        <p className="text-xs text-zinc-400 font-mono mt-0.5">ID: {warehouse.id}</p>
        {warehouse.warehouseDocks.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {warehouse.warehouseDocks.map((dock) => (
              <span
                key={dock.dockId}
                className="inline-flex items-center rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600"
              >
                Dock {dock.dockId} · {dock.time || "0s"} lead time
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => setEditing(true)}
          className="p-1.5 rounded text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
          title="Edit warehouse"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <form action={deleteAction}>
          <input type="hidden" name="id" value={warehouse.id} />
          <button
            type="submit"
            disabled={deletePending}
            onClick={(e) => {
              if (!confirm(`Delete warehouse "${warehouse.name}"? This will remove all inventory data.`)) {
                e.preventDefault();
              }
            }}
            className="p-1.5 rounded text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
            title={deleteState.error ?? "Delete warehouse"}
          >
            {deletePending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : deleteState.error ? (
              <AlertCircle className="w-3.5 h-3.5 text-red-500" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
