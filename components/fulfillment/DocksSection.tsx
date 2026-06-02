"use client";

import { useState } from "react";
import { Plus, Anchor } from "lucide-react";
import { DockCard } from "@/components/fulfillment/DockCard";
import { CreateDockForm } from "@/components/fulfillment/CreateDockForm";
import type { VtexDock } from "@/lib/types/catalog";

interface DocksSectionProps {
  docks: VtexDock[];
}

export function DocksSection({ docks }: DocksSectionProps) {
  const [showCreate, setShowCreate] = useState(false);

  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">
          Loading Docks ({docks.length})
        </h2>
        {!showCreate && (
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New Dock
          </button>
        )}
      </div>

      {showCreate && (
        <div className="mb-3">
          <CreateDockForm onCancel={() => setShowCreate(false)} />
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {docks.length === 0 ? (
          <p className="text-sm text-zinc-400 col-span-2">
            No loading docks configured. Create one to link warehouses to shipping policies.
          </p>
        ) : (
          docks.map((dock) => <DockCard key={dock.id} dock={dock} />)
        )}
      </div>
    </section>
  );
}
