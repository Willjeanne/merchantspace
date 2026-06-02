import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProductsTable } from "@/components/catalog/ProductsTable";
import { BrandsTab } from "@/components/catalog/BrandsTab";
import { CategoriesTab } from "@/components/catalog/CategoriesTab";
import {
  listSellerProducts,
  getSellerBrands,
  getSellerCategories,
} from "@/lib/vtex/catalog";
import { cn } from "@/lib/utils";

type Tab = "products" | "brands" | "categories";

const TABS: { id: Tab; label: string }[] = [
  { id: "products", label: "Products" },
  { id: "brands", label: "Brands" },
  { id: "categories", label: "Categories" },
];

interface CatalogPageProps {
  searchParams: Promise<{ q?: string; from?: string; tab?: string }>;
}

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const params = await searchParams;
  const q = params.q ?? "";
  const from = Number(params.from ?? 0);
  const tab = (params.tab as Tab) ?? "products";
  const pageSize = 50;

  return (
    <>
      <PageHeader
        title="Catalog"
        description="Manage your seller products, brands, and categories"
        actions={
          tab === "products" ? (
            <Link
              href="/catalog/new"
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Product
            </Link>
          ) : null
        }
      />

      {/* Tab bar */}
      <div className="flex gap-0.5 border-b border-zinc-200 mb-6">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={t.id === "products" ? "/catalog" : `/catalog?tab=${t.id}`}
            className={cn(
              "px-4 py-2.5 text-sm font-medium rounded-t transition-colors border-b-2 -mb-px",
              tab === t.id
                ? "border-indigo-600 text-indigo-600 bg-white"
                : "border-transparent text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50"
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* Products tab */}
      {tab === "products" && (
        <ProductsTabContent q={q} from={from} pageSize={pageSize} />
      )}

      {/* Brands tab */}
      {tab === "brands" && <BrandsTabContent />}

      {/* Categories tab */}
      {tab === "categories" && <CategoriesTabContent />}
    </>
  );
}

// ─── Products tab ─────────────────────────────────────────────────────────────

async function ProductsTabContent({
  q,
  from,
  pageSize,
}: {
  q: string;
  from: number;
  pageSize: number;
}) {
  let catalogError: string | null = null;
  const allProducts = await listSellerProducts({ from, to: from + pageSize - 1 }).catch(
    (err) => {
      catalogError = err instanceof Error ? err.message : String(err);
      console.error("[CatalogPage] listSellerProducts failed:", catalogError);
      return [];
    }
  );

  const products = q
    ? allProducts.filter(
        (p) =>
          p.name.toLowerCase().includes(q.toLowerCase()) ||
          (p.refId ?? "").toLowerCase().includes(q.toLowerCase())
      )
    : allProducts;

  return (
    <>
      <form method="GET" className="mb-4 flex items-center gap-3">
        <input
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Search products…"
          className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
        />
        <input type="hidden" name="tab" value="products" />
      </form>

      {catalogError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <strong>API Error:</strong> {catalogError}
        </div>
      )}

      <ProductsTable products={products} />

      {(from > 0 || products.length === pageSize) && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-zinc-500">
            Showing {from + 1}–{from + products.length}
          </p>
          <div className="flex gap-2">
            {from > 0 && (
              <Link
                href={`/catalog?from=${Math.max(0, from - pageSize)}${q ? `&q=${q}` : ""}`}
                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
              >
                ← Previous
              </Link>
            )}
            {products.length === pageSize && (
              <Link
                href={`/catalog?from=${from + pageSize}${q ? `&q=${q}` : ""}`}
                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
              >
                Next →
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ─── Brands tab ───────────────────────────────────────────────────────────────

async function BrandsTabContent() {
  const brands = await getSellerBrands().catch(() => []);
  return <BrandsTab brands={brands} />;
}

// ─── Categories tab ───────────────────────────────────────────────────────────

async function CategoriesTabContent() {
  const categories = await getSellerCategories().catch(() => []);
  return <CategoriesTab categories={categories} />;
}
