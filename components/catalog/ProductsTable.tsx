import Link from "next/link";
import { Package, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VtexProductListItem } from "@/lib/vtex/catalog";

interface ProductsTableProps {
  products: VtexProductListItem[];
}

export function ProductsTable({ products }: ProductsTableProps) {
  if (products.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-zinc-200 flex flex-col items-center justify-center py-16 gap-4">
        <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center">
          <Package className="w-6 h-6 text-zinc-400" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-zinc-700">No products yet</p>
          <p className="text-xs text-zinc-400 mt-1">
            Create your first product to start selling on the marketplace.
          </p>
        </div>
        <Link
          href="/catalog/new"
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Product
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-zinc-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-50 border-b border-zinc-100">
              <th className="text-left px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                Product
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                Brand
              </th>
              <th className="text-center px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                SKUs
              </th>
              <th className="text-center px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {products.map((product) => (
              <tr
                key={product.productId}
                className="hover:bg-zinc-50 transition-colors cursor-pointer group"
              >
                {/* Product image + name */}
                <td className="px-6 py-3.5">
                  <Link href={`/catalog/${product.productId}`} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0 overflow-hidden">
                      {product.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Package className="w-5 h-5 text-zinc-300" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-zinc-900 group-hover:text-indigo-600 truncate max-w-[300px] transition-colors" title={product.name}>
                        {product.name}
                      </p>
                      <p className="text-xs text-zinc-400 font-mono mt-0.5">
                        ID: {product.productId}
                        {product.refId ? ` · ${product.refId}` : ""}
                      </p>
                    </div>
                  </Link>
                </td>

                {/* Brand */}
                <td className="px-4 py-3.5">
                  <span className="text-sm text-zinc-600">{product.brandName}</span>
                </td>

                {/* SKU count */}
                <td className="px-4 py-3.5 text-center">
                  <span className="inline-flex items-center justify-center rounded-full bg-zinc-100 w-6 h-6 text-xs font-medium text-zinc-700">
                    {product.skuCount}
                  </span>
                </td>

                {/* Status */}
                <td className="px-6 py-3.5 text-center">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                      product.isSkuActive
                        ? "bg-green-100 text-green-700"
                        : "bg-amber-100 text-amber-700"
                    )}
                  >
                    {product.isSkuActive ? "Active" : "Inactive"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
