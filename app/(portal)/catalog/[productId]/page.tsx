import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Package, ImageIcon } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProductEditForm } from "@/components/catalog/ProductEditForm";
import { SkuDetailRow } from "@/components/catalog/SkuDetailRow";
import { AddImageForm } from "@/components/catalog/AddImageForm";
import {
  getSellerProductFull,
  getSellerCategories,
  getSellerBrands,
  getSkuImages,
} from "@/lib/vtex/catalog";

interface ProductDetailPageProps {
  params: Promise<{ productId: string }>;
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { productId: productIdStr } = await params;
  const productId = Number(productIdStr);

  if (!productId || isNaN(productId)) notFound();

  const [{ product, skus, prices, inventory }, categories, brands] =
    await Promise.all([
      getSellerProductFull(productId),
      getSellerCategories().catch(() => []),
      getSellerBrands().catch(() => []),
    ]);

  if (!product && skus.length === 0) notFound();

  const firstSkuId = skus[0]?.Id;
  // Seller Portal: images are at product level, pass productId as second arg
  const images = firstSkuId ? await getSkuImages(firstSkuId, productId) : [];

  // Use product or build a minimal placeholder if GET /product/{id} returned 500
  const displayProduct = product ?? {
    Id: productId,
    Name: `Product #${productId}`,
    Description: "",
    CategoryId: 0,
    BrandId: 0,
    RefId: null,
    Title: "",
    IsActive: true,
    LinkId: "",
    DepartmentId: 0,
    IsVisible: true,
    MetaTagDescription: "",
    Score: null,
  };

  return (
    <>
      <PageHeader
        title={displayProduct.Name}
        description={`Product #${productId} · ${skus.length} SKU${skus.length !== 1 ? "s" : ""}`}
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

      <div className="space-y-6">
        {/* Product info — editable form */}
        <ProductEditForm
          product={{
            Id: displayProduct.Id,
            Name: displayProduct.Name,
            Description: displayProduct.Description ?? "",
            CategoryId: displayProduct.CategoryId,
            BrandId: displayProduct.BrandId,
            RefId: displayProduct.RefId,
            Title: displayProduct.Title ?? "",
            IsActive: displayProduct.IsActive,
          }}
          categories={categories}
          brands={brands}
        />

        {/* Images */}
        {firstSkuId !== undefined && (
          <div className="bg-white rounded-lg border border-zinc-200 p-6">
            <h3 className="text-sm font-semibold text-zinc-700 mb-4">Images</h3>

            {images.length > 0 ? (
              <div className="flex flex-wrap gap-3 mb-4">
                {images.map((img) => (
                  <div
                    key={img.Id}
                    className="relative w-24 h-24 rounded-lg overflow-hidden border border-zinc-200 bg-zinc-50"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.Url}
                      alt={img.Label}
                      className="w-full h-full object-cover"
                    />
                    {img.IsMain && (
                      <span className="absolute top-1 left-1 rounded text-[10px] bg-indigo-600 text-white px-1 py-0.5 font-medium">
                        Main
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-lg border border-dashed border-zinc-200 p-4 mb-4 text-sm text-zinc-400">
                <ImageIcon className="w-5 h-5 shrink-0" />
                <span>No images yet. Add one below.</span>
              </div>
            )}

            <AddImageForm skuId={firstSkuId} productId={productId} />
          </div>
        )}

        {/* SKUs */}
        <div className="bg-white rounded-lg border border-zinc-200 p-6">
          <h3 className="text-sm font-semibold text-zinc-700 mb-4">
            SKUs ({skus.length})
          </h3>

          {skus.length === 0 ? (
            <div className="flex items-center gap-3 rounded-lg border border-dashed border-zinc-200 p-4 text-sm text-zinc-400">
              <Package className="w-5 h-5 shrink-0" />
              <span>No SKUs found for this product.</span>
            </div>
          ) : (
            <div className="space-y-3">
              {skus.map((sku, i) => (
                <SkuDetailRow
                  key={sku.Id}
                  sku={sku}
                  price={prices[i] ?? null}
                  inventory={inventory[i] ?? []}
                  productId={productId}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
