"use client";

import { useActionState } from "react";
import { AlertCircle, Loader2, ChevronRight } from "lucide-react";
import { createProductAction } from "@/lib/actions/catalog";
import type { CreateProductState } from "@/lib/actions/catalog";
import type { VtexCategory, VtexBrand } from "@/lib/types/catalog";
import { CategoryPicker } from "@/components/catalog/CategoryPicker";

interface ProductFormProps {
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
    <label htmlFor={htmlFor} className="block text-xs font-medium text-zinc-700 mb-1">
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

function FieldInput({
  id,
  name,
  type = "text",
  placeholder,
  defaultValue,
  step,
  min,
  required,
}: {
  id: string;
  name: string;
  type?: string;
  placeholder?: string;
  defaultValue?: string | number;
  step?: string;
  min?: string;
  required?: boolean;
}) {
  return (
    <input
      id={id}
      name={name}
      type={type}
      placeholder={placeholder}
      defaultValue={defaultValue}
      step={step}
      min={min}
      required={required}
      className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
    />
  );
}

export function ProductForm({ categories, brands }: ProductFormProps) {
  const [state, formAction, isPending] = useActionState<CreateProductState, FormData>(
    createProductAction,
    {}
  );

  const activeBrands = brands.filter((b) => b.isActive);

  return (
    <form action={formAction} className="space-y-8">
      {/* Error banner */}
      {state.error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{state.error}</p>
        </div>
      )}

      {/* No categories warning */}
      {categories.length === 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-700">
            <p className="font-medium">No categories found in your catalog.</p>
            <p className="mt-0.5">
              Create at least one category in{" "}
              <a
                href="https://franceretailer1388.myvtex.com/admin/Site/CategoryForm.aspx"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-medium"
              >
                VTEX Admin → Catalog → Categories
              </a>{" "}
              before adding products.
            </p>
          </div>
        </div>
      )}

      {/* Section 1 — Product info */}
      <section className="bg-white rounded-lg border border-zinc-200 p-6">
        <h2 className="text-sm font-semibold text-zinc-700 mb-4 flex items-center gap-2">
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-600 text-white text-xs font-bold">
            1
          </span>
          Product Information
        </h2>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <FieldLabel htmlFor="productName" required>
              Product Name
            </FieldLabel>
            <FieldInput
              id="productName"
              name="productName"
              placeholder="e.g. Premium Running Shoes"
              required
            />
          </div>

          <div>
            <FieldLabel required>
              Category
            </FieldLabel>
            <CategoryPicker
              categories={categories}
              name="categoryId"
              required
              disabled={categories.length === 0}
            />
          </div>

          <div>
            <FieldLabel htmlFor="brandId" required>
              Brand
            </FieldLabel>
            <select
              id="brandId"
              name="brandId"
              required
              disabled={activeBrands.length === 0}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition disabled:opacity-50"
            >
              <option value="">Select a brand…</option>
              {activeBrands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
            {activeBrands.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">
                No brands found.{" "}
                <a
                  href="https://franceretailer1388.myvtex.com/admin/Site/BrandForm.aspx"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  Create one in VTEX Admin
                </a>
                .
              </p>
            )}
          </div>

          <div>
            <FieldLabel htmlFor="refId">Reference ID</FieldLabel>
            <FieldInput
              id="refId"
              name="refId"
              placeholder="e.g. SHOE-001"
            />
          </div>

          <div className="col-span-2">
            <FieldLabel htmlFor="description">Description</FieldLabel>
            <textarea
              id="description"
              name="description"
              rows={3}
              placeholder="Product description…"
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition resize-none"
            />
          </div>
        </div>
      </section>

      {/* Section 2 — SKU */}
      <section className="bg-white rounded-lg border border-zinc-200 p-6">
        <h2 className="text-sm font-semibold text-zinc-700 mb-4 flex items-center gap-2">
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-600 text-white text-xs font-bold">
            2
          </span>
          SKU Details
        </h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <FieldLabel htmlFor="skuName" required>
              SKU Name
            </FieldLabel>
            <FieldInput
              id="skuName"
              name="skuName"
              placeholder="e.g. Size 42 / Blue"
              required
            />
          </div>

          <div>
            <FieldLabel htmlFor="skuRefId">SKU Reference ID</FieldLabel>
            <FieldInput
              id="skuRefId"
              name="skuRefId"
              placeholder="e.g. SHOE-001-42-BL"
            />
          </div>

          <div>
            <FieldLabel htmlFor="weightKg">Weight (kg)</FieldLabel>
            <FieldInput
              id="weightKg"
              name="weightKg"
              type="number"
              step="0.001"
              min="0"
              defaultValue="0.5"
              placeholder="0.5"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <FieldLabel htmlFor="height">Height (cm)</FieldLabel>
              <FieldInput
                id="height"
                name="height"
                type="number"
                step="0.1"
                min="0"
                defaultValue="10"
                placeholder="10"
              />
            </div>
            <div>
              <FieldLabel htmlFor="width">Width (cm)</FieldLabel>
              <FieldInput
                id="width"
                name="width"
                type="number"
                step="0.1"
                min="0"
                defaultValue="10"
                placeholder="10"
              />
            </div>
            <div>
              <FieldLabel htmlFor="length">Length (cm)</FieldLabel>
              <FieldInput
                id="length"
                name="length"
                type="number"
                step="0.1"
                min="0"
                defaultValue="10"
                placeholder="10"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Section 3 — Pricing & Stock */}
      <section className="bg-white rounded-lg border border-zinc-200 p-6">
        <h2 className="text-sm font-semibold text-zinc-700 mb-4 flex items-center gap-2">
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-600 text-white text-xs font-bold">
            3
          </span>
          Pricing & Stock
        </h2>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <FieldLabel htmlFor="sellingPrice" required>
              Selling Price (€)
            </FieldLabel>
            <FieldInput
              id="sellingPrice"
              name="sellingPrice"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="29.99"
              required
            />
          </div>

          <div>
            <FieldLabel htmlFor="listPrice">List Price / MSRP (€)</FieldLabel>
            <FieldInput
              id="listPrice"
              name="listPrice"
              type="number"
              step="0.01"
              min="0"
              placeholder="39.99"
            />
            <p className="text-xs text-zinc-400 mt-1">
              Shown as "from" price, used for strikethrough.
            </p>
          </div>

          <div>
            <FieldLabel htmlFor="quantity" required>
              Initial Stock
            </FieldLabel>
            <FieldInput
              id="quantity"
              name="quantity"
              type="number"
              min="0"
              defaultValue="0"
              placeholder="0"
              required
            />
            <p className="text-xs text-zinc-400 mt-1">
              Units added to your first warehouse.
            </p>
          </div>
        </div>
      </section>

      {/* Submit */}
      <div className="flex items-center justify-end gap-3">
        <a
          href="/catalog"
          className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
        >
          Cancel
        </a>
        <button
          type="submit"
          disabled={isPending || categories.length === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Creating…
            </>
          ) : (
            <>
              Create Product
              <ChevronRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </form>
  );
}
