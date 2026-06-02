import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProductForm } from "@/components/catalog/ProductForm";
import { getSellerCategories, getSellerBrands } from "@/lib/vtex/catalog";

export default async function NewProductPage() {
  const [categories, brands] = await Promise.all([
    getSellerCategories().catch(() => []),
    getSellerBrands().catch(() => []),
  ]);

  return (
    <>
      <PageHeader
        title="New Product"
        description="Create a product in your seller catalog — it will be available on the franceretail marketplace."
        actions={
          <Link
            href="/catalog"
            className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Catalog
          </Link>
        }
      />

      <ProductForm categories={categories} brands={brands} />
    </>
  );
}
