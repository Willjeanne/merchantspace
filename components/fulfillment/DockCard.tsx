"use client";

import { useActionState, useState } from "react";
import { Anchor, Loader2, CheckCircle2, Pencil, Trash2, AlertCircle } from "lucide-react";
import { updateDockAction, deleteDockAction } from "@/lib/actions/fulfillment";
import type { DockActionState } from "@/lib/actions/fulfillment";
import type { VtexDock } from "@/lib/types/catalog";

interface DockCardProps {
  dock: VtexDock;
}

export function DockCard({ dock }: DockCardProps) {
  const [editing, setEditing] = useState(false);
  const [editState, editAction, editPending] = useActionState<DockActionState, FormData>(
    updateDockAction,
    {}
  );
  const [deleteState, deleteAction, deletePending] = useActionState<DockActionState, FormData>(
    deleteDockAction,
    {}
  );

  if (editing) {
    return (
      <div className="bg-white rounded-lg border border-indigo-200 p-5">
        <form action={editAction} className="space-y-3">
          <input type="hidden" name="id" value={dock.id} />
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">
              Dock Name
            </label>
            <input
              name="name"
              type="text"
              required
              defaultValue={dock.name}
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
      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 shrink-0">
        <Anchor className="w-5 h-5 text-blue-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-zinc-800">{dock.name}</p>
        <p className="text-xs text-zinc-400 font-mono mt-0.5">ID: {dock.id}</p>
        {dock.warehouseIds?.length > 0 && (
          <p className="text-xs text-zinc-500 mt-1">
            Linked warehouses: {dock.warehouseIds.join(", ")}
          </p>
        )}
        {dock.dockTimeFake && dock.dockTimeFake !== "00:00:00" && (
          <p className="text-xs text-zinc-400 mt-0.5">Lead time: {dock.dockTimeFake}</p>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => setEditing(true)}
          className="p-1.5 rounded text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
          title="Edit dock"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <form action={deleteAction}>
          <input type="hidden" name="id" value={dock.id} />
          <button
            type="submit"
            disabled={deletePending}
            onClick={(e) => {
              if (!confirm(`Delete dock "${dock.name}"?`)) e.preventDefault();
            }}
            className="p-1.5 rounded text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
            title={deleteState.error ?? "Delete dock"}
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
