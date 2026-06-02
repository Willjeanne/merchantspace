"use client";

import { useActionState, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Loader2, CheckCircle2, AlertCircle, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  createBrandAction,
  updateBrandAction,
  deleteBrandAction,
} from "@/lib/actions/catalog";
import type {
  BrandActionState,
} from "@/lib/actions/catalog";
import type { VtexBrand } from "@/lib/types/catalog";

interface BrandsTabProps {
  brands: VtexBrand[];
}

function CreateBrandForm({ onCancel }: { onCancel: () => void }) {
  const [state, formAction, isPending] = useActionState<BrandActionState, FormData>(
    createBrandAction,
    {}
  );
  const [isActive, setIsActive] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      router.refresh();
      onCancel();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success]);

  return (
    <form action={formAction} className="p-4 bg-zinc-50 rounded-lg border border-zinc-200 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Name */}
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-zinc-700 mb-1">
            Brand Name <span className="text-red-500">*</span>
          </label>
          <input
            name="name"
            type="text"
            required
            placeholder="e.g. Makita"
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
        </div>

        {/* Status */}
        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-2">Status</label>
          <input type="hidden" name="isActive" value={isActive ? "true" : "false"} />
          <button
            type="button"
            onClick={() => setIsActive((v) => !v)}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium border transition-colors",
              isActive
                ? "bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                : "bg-zinc-100 border-zinc-200 text-zinc-500 hover:bg-zinc-200"
            )}
          >
            <span className={cn("w-2 h-2 rounded-full", isActive ? "bg-green-500" : "bg-zinc-400")} />
            {isActive ? "Active" : "Inactive"}
          </button>
        </div>

        {/* SEO Title */}
        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-1">SEO Title</label>
          <input
            name="siteTitle"
            type="text"
            placeholder="Brand page title (SEO)"
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
        </div>

        {/* URL Slug */}
        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-1">URL Slug</label>
          <input
            name="linkId"
            type="text"
            placeholder="e.g. makita-tools"
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
        </div>

        {/* Keywords */}
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-zinc-700 mb-1">Keywords</label>
          <input
            name="keywords"
            type="text"
            placeholder="Comma-separated keywords for search"
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
        </div>

        {/* Description */}
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-zinc-700 mb-1">Meta Description</label>
          <textarea
            name="text"
            rows={2}
            placeholder="Short brand description for SEO (max 150 chars)"
            maxLength={150}
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition resize-none"
          />
        </div>
      </div>

      <p className="text-xs text-zinc-400">
        Name and Status are saved via the Seller Portal API. SEO fields (Title, Slug, Keywords, Description) are applied via the Classic Catalog API as a best-effort update.
      </p>

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          Create Brand
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
        >
          Cancel
        </button>
      </div>
      {state.error && <p className="text-xs text-red-600">{state.error}</p>}
    </form>
  );
}

function EditBrandRow({
  brand,
  onCancel,
}: {
  brand: VtexBrand;
  onCancel: () => void;
}) {
  const [state, formAction, isPending] = useActionState<BrandActionState, FormData>(
    updateBrandAction,
    {}
  );
  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      router.refresh();
      onCancel();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success]);

  return (
    <form action={formAction} className="flex items-center gap-3 px-6 py-3 bg-indigo-50">
      <input type="hidden" name="id" value={brand.id} />
      <input type="hidden" name="isActive" value={brand.isActive ? "true" : "false"} />
      <input
        name="name"
        type="text"
        defaultValue={brand.name}
        required
        className="flex-1 rounded border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
      />
      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center gap-1.5 rounded bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
      >
        {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="text-xs text-zinc-500 hover:text-zinc-700 transition-colors"
      >
        Cancel
      </button>
      {state.error && <p className="text-xs text-red-600">{state.error}</p>}
      {state.success && <CheckCircle2 className="w-4 h-4 text-green-500" />}
    </form>
  );
}

function DeleteBrandButton({ brand }: { brand: VtexBrand }) {
  const [state, formAction, isPending] = useActionState<BrandActionState, FormData>(
    deleteBrandAction,
    {}
  );
  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success]);

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={brand.id} />
      <button
        type="submit"
        disabled={isPending}
        onClick={(e) => {
          if (!confirm(`Delete brand "${brand.name}"? This cannot be undone.`)) {
            e.preventDefault();
          }
        }}
        className="p-1.5 rounded text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
        title={state.error ?? "Delete brand"}
      >
        {isPending ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : state.error ? (
          <AlertCircle className="w-3.5 h-3.5 text-red-500" />
        ) : (
          <Trash2 className="w-3.5 h-3.5" />
        )}
      </button>
    </form>
  );
}

export function BrandsTab({ brands }: BrandsTabProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">
          {brands.length} brand{brands.length !== 1 ? "s" : ""} in your catalog
        </p>
        {!showCreate && (
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Brand
          </button>
        )}
      </div>

      {/* Create form */}
      {showCreate && (
        <CreateBrandForm onCancel={() => setShowCreate(false)} />
      )}

      {/* Brands table */}
      <div className="bg-white rounded-lg border border-zinc-200 overflow-hidden">
        {brands.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center">
              <Tag className="w-6 h-6 text-zinc-400" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-zinc-700">No brands yet</p>
              <p className="text-xs text-zinc-400 mt-1">
                Create a brand before adding products.
              </p>
            </div>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-100">
                <th className="text-left px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                  Brand
                </th>
                <th className="text-center px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                  ID
                </th>
                <th className="text-center px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                  Status
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {brands.map((brand) =>
                editingId === brand.id ? (
                  <tr key={brand.id}>
                    <td colSpan={4} className="p-0">
                      <EditBrandRow
                        brand={brand}
                        onCancel={() => setEditingId(null)}
                      />
                    </td>
                  </tr>
                ) : (
                  <tr key={brand.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-6 py-3.5">
                      <p className="font-medium text-zinc-900">{brand.name}</p>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="text-xs text-zinc-400 font-mono">{brand.id}</span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                          brand.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-zinc-100 text-zinc-500"
                        )}
                      >
                        {brand.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setEditingId(brand.id)}
                          className="p-1.5 rounded text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                          title="Edit brand"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <DeleteBrandButton brand={brand} />
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
