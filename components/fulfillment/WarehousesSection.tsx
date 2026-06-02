"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { WarehouseCard } from "@/components/fulfillment/WarehouseCard";
import { CreateWarehouseForm } from "@/components/fulfillment/CreateWarehouseForm";
import type { VtexWarehouse } from "@/lib/types/catalog";

interface WarehousesSectionProps {
  warehouses: VtexWarehouse[];
}

export function WarehousesSection({ warehouses }: WarehousesSectionProps) {
  const [showCreate, setShowCreate] = useState(false);

  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">
          Warehouses ({warehouses.length})
        </h2>
        {!showCreate && (
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New Warehouse
          </button>
        )}
      </div>

      {showCreate && (
        <div className="mb-3">
          <CreateWarehouseForm onCancel={() => setShowCreate(false)} />
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {warehouses.length === 0 ? (
          <p className="text-sm text-zinc-400 col-span-2">
            No warehouses configured.
          </p>
        ) : (
          warehouses.map((w) => <WarehouseCard key={w.id} warehouse={w} />)
        )}
      </div>
    </section>
  );
}
