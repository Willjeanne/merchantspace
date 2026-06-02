"use client";

import { useActionState } from "react";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { updateProductAction } from "@/lib/actions/catalog";
import type { UpdateProductState } from "@/lib/actions/catalog";
import type { VtexCategory, VtexBrand } from "@/lib/types/catalog";
import { CategoryPicker } from "@/components/catalog/CategoryPicker";

interface ProductEditFormProps {
  product: {
    Id: number;
    Name: string;
    Description: string;
    CategoryId: number;
    BrandId: number;
    RefId: string | null;
    Title: string;
    IsActive: boolean;
  };
  categories: VtexCategory[];
  brands: VtexBrand[];
}

function FieldLabel({
  htmlFor,
  children,
  required,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-xs font-medium text-zinc-700 mb-1"
    >
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

export function ProductEditForm({
  product,
  categories,
  brands,
}: ProductEditFormProps) {
  const [state, formAction, isPending] = useActionState<UpdateProductState, FormData>(
    updateProductAction,
    {}
  );

  const activeBrands = brands.filter((b) => b.isActive);

  return (
    <form action={formAction} className="bg-white rounded-lg border border-zinc-200 p-6 space-y-4">
      <input type="hidden" name="productId" value={product.Id} />

      <h3 className="text-sm font-semibold text-zinc-700">Product Information</h3>

      {state.error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-700">{state.error}</p>
        </div>
      )}
      {state.success && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
          <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
          <p className="text-sm text-green-700">Product updated successfully</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <FieldLabel htmlFor="productName" required>Product Name</FieldLabel>
          <input
            id="productName"
            name="productName"
            type="text"
            required
            defaultValue={product.Name}
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
        </div>

        <div>
          <FieldLabel required>Category</FieldLabel>
          <CategoryPicker
            categories={categories}
            defaultValue={product.CategoryId || undefined}
            name="categoryId"
            required
          />
        </div>

        <div>
          <FieldLabel htmlFor="brandId" required>Brand</FieldLabel>
          <select
            id="brandId"
            name="brandId"
            required
            defaultValue={product.BrandId || ""}
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          >
            <option value="">Select a brand…</option>
            {activeBrands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <FieldLabel htmlFor="refId">Reference ID</FieldLabel>
          <input
            id="refId"
            name="refId"
            type="text"
            defaultValue={product.RefId ?? ""}
            placeholder="e.g. PROD-001"
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
        </div>

        <div>
          <FieldLabel htmlFor="title">SEO Title</FieldLabel>
          <input
            id="title"
            name="title"
            type="text"
            defaultValue={product.Title ?? product.Name}
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
        </div>

        <div className="col-span-2">
          <FieldLabel htmlFor="description">Description</FieldLabel>
          <textarea
            id="description"
            name="description"
            rows={3}
            defaultValue={product.Description ?? ""}
            placeholder="Product description…"
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition resize-none"
          />
        </div>

        <div className="col-span-2 flex items-center gap-3">
          <FieldLabel>Status</FieldLabel>
          {/* isActive logic: checkbox sends "true" when checked, nothing when unchecked */}
          {/* Action reads: formData.get("isActive") === "true" */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="isActive"
              value="true"
              defaultChecked={product.IsActive}
              className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-zinc-700">Active (visible on marketplace)</span>
          </label>
        </div>
      </div>

      <div className="flex justify-end pt-2 border-t border-zinc-100">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          {isPending ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
          ) : (
            "Save Changes"
          )}
        </button>
      </div>
    </form>
  );
}
