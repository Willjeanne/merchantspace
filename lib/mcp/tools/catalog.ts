import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/server";
import {
  listSellerProducts,
  getSellerProduct,
  getSellerProductFull,
  updateSellerProduct,
  createSellerProduct,
  getProductSkus,
  createSellerSku,
  updateSellerSku,
  addSkuImageByUrl,
  addSkuImageByFile,
  addProductImageViaSellerPortal,
  getSkuImages,
  deleteSkuImage,
  getSellerCategories,
  createSellerCategory,
  getSellerBrands,
  createSellerBrand,
  updateSellerBrand,
  deleteSellerBrand,
  getSkuPrice,
  setSkuPrice,
  getSellerWarehouses,
  createSellerWarehouse,
  updateSellerWarehouse,
  deleteSellerWarehouse,
  getSkuInventory,
  setSkuInventory,
  getSellerDocks,
  createSellerDock,
  updateSellerDock,
  deleteSellerDock,
  getShippingPolicies,
} from "@/lib/vtex/catalog";
import { safe, safeNoArgs } from "../utils";

// ─── Shared fragments ──────────────────────────────────────────────────────

const warehouseDock = z.object({ dockId: z.string(), time: z.string(), cost: z.string() });

const brandFields = z.object({
  Name: z.string(),
  IsActive: z.boolean(),
  SiteTitle: z.string().optional(),
  Text: z.string().optional(),
  Keywords: z.string().optional(),
  LinkId: z.string().optional(),
});

export function registerCatalogTools(server: McpServer) {
  // ─── Products ──────────────────────────────────────────────────────────

  server.registerTool(
    "vtex_list_products",
    {
      title: "List seller products",
      description:
        "Lists products in the seller catalog via catalog_system/pvt/products/GetProductAndSkuIds + stockKeepingUnitById (bypasses the unreliable search index on seller-only accounts).",
      inputSchema: z.object({
        from: z.number().int().min(0).optional().describe("Default 0"),
        to: z.number().int().min(0).optional().describe("Default 49"),
      }),
    },
    safe(listSellerProducts)
  );

  server.registerTool(
    "vtex_get_product",
    {
      title: "Get product by ID",
      description: "GET /api/catalog/pvt/product/{productId} — raw product record.",
      inputSchema: z.object({ productId: z.number().int() }),
    },
    safe(({ productId }) => getSellerProduct(productId))
  );

  server.registerTool(
    "vtex_get_product_full",
    {
      title: "Get full product detail",
      description:
        "Product + all SKUs + prices + inventory, fetched in parallel with fallback strategies for Seller Portal accounts where the classic Catalog API 500s.",
      inputSchema: z.object({ productId: z.number().int() }),
    },
    safe(({ productId }) => getSellerProductFull(productId))
  );

  server.registerTool(
    "vtex_update_product",
    {
      title: "Update product",
      description:
        "Updates product fields. Fetches the current product first (with SKU-based reconstruction fallback) and merges — omitted fields keep their current value.",
      inputSchema: z.object({
        productId: z.number().int(),
        updates: z
          .object({
            Name: z.string().optional(),
            DepartmentId: z.number().optional(),
            CategoryId: z.number().optional(),
            BrandId: z.number().optional(),
            LinkId: z.string().optional(),
            RefId: z.string().nullable().optional(),
            IsVisible: z.boolean().optional(),
            Description: z.string().optional(),
            IsActive: z.boolean().optional(),
            Title: z.string().optional(),
            MetaTagDescription: z.string().optional(),
          })
          .describe("Partial VtexProduct — only include fields you want to change"),
      }),
    },
    safe(({ productId, updates }) => updateSellerProduct(productId, updates))
  );

  server.registerTool(
    "vtex_create_product",
    {
      title: "Create product + first SKU",
      description:
        "POST /api/catalog-seller-portal/products — creates a product and its first SKU atomically. This is the correct API for Seller Portal accounts (classic catalog/pvt/product 500s on them).",
      inputSchema: z.object({
        Name: z.string(),
        CategoryId: z.number().int(),
        BrandId: z.number().int(),
        RefId: z.string().nullable().optional(),
        Description: z.string(),
        IsActive: z.boolean(),
        SkuName: z.string(),
        SkuRefId: z.string().optional(),
        PackagedWeightKg: z.number(),
        PackagedHeight: z.number(),
        PackagedWidth: z.number(),
        PackagedLength: z.number(),
      }),
    },
    safe(createSellerProduct)
  );

  // ─── SKUs ──────────────────────────────────────────────────────────────

  server.registerTool(
    "vtex_get_product_skus",
    {
      title: "Get product SKUs",
      description: "GET /api/catalog/pvt/product/{productId}/stockkeepingunit — all SKUs for a product.",
      inputSchema: z.object({ productId: z.number().int() }),
    },
    safe(({ productId }) => getProductSkus(productId))
  );

  server.registerTool(
    "vtex_create_sku",
    {
      title: "Create SKU",
      description: "POST /api/catalog/pvt/stockkeepingunit — creates a SKU in the seller catalog.",
      inputSchema: z.object({
        ProductId: z.number().int(),
        IsActive: z.boolean(),
        Name: z.string(),
        RefId: z.string(),
        PackagedHeight: z.number(),
        PackagedLength: z.number(),
        PackagedWidth: z.number(),
        PackagedWeightKg: z.number(),
        MeasurementUnit: z.string(),
        UnitMultiplier: z.number(),
      }),
    },
    safe(createSellerSku)
  );

  server.registerTool(
    "vtex_update_sku",
    {
      title: "Update SKU",
      description:
        "GET current SKU then PUT /api/catalog/pvt/stockkeepingunit/{skuId} merged with the given updates.",
      inputSchema: z.object({
        skuId: z.number().int(),
        updates: z
          .object({
            IsActive: z.boolean().optional(),
            Name: z.string().optional(),
            RefId: z.string().optional(),
            PackagedHeight: z.number().optional(),
            PackagedLength: z.number().optional(),
            PackagedWidth: z.number().optional(),
            PackagedWeightKg: z.number().optional(),
            Height: z.number().nullable().optional(),
            Length: z.number().nullable().optional(),
            Width: z.number().nullable().optional(),
            WeightKg: z.number().nullable().optional(),
            ManufacturerCode: z.string().optional(),
            MeasurementUnit: z.string().optional(),
            UnitMultiplier: z.number().optional(),
          })
          .describe("Partial VtexSku — only include fields you want to change"),
      }),
    },
    safe(({ skuId, updates }) => updateSellerSku(skuId, updates))
  );

  // ─── Product / SKU images ──────────────────────────────────────────────

  server.registerTool(
    "vtex_add_sku_image_by_url",
    {
      title: "Add SKU image from a URL",
      description:
        "Downloads an external image, re-uploads it to VTEX (catalog-images IO service, falling back to the vtexassets.com CDN), then attaches it to the product via the Seller Portal PUT. Requires a live VTEX session token — App Key/Token cannot be used for this endpoint.",
      inputSchema: z.object({
        skuId: z.number().int(),
        imageUrl: z.string().url(),
        imageName: z.string(),
        productId: z.number().int(),
        vtexAuthToken: z
          .string()
          .describe("VtexIdclientAutCookie session token of a logged-in admin/seller user"),
      }),
    },
    safe(({ skuId, imageUrl, imageName, productId, vtexAuthToken }) =>
      addSkuImageByUrl(skuId, imageUrl, imageName, productId, vtexAuthToken)
    )
  );

  server.registerTool(
    "vtex_add_sku_image_by_file",
    {
      title: "Add SKU image from raw file bytes",
      description:
        "Uploads a base64-encoded image file to VTEX (catalog-images IO service) then attaches it to the product via the Seller Portal PUT. Requires a live VTEX session token.",
      inputSchema: z.object({
        skuId: z.number().int(),
        fileBase64: z.string().describe("Base64-encoded image bytes"),
        fileName: z.string(),
        mimeType: z.string().describe('e.g. "image/jpeg"'),
        productId: z.number().int(),
        vtexAuthToken: z
          .string()
          .describe("VtexIdclientAutCookie session token of a logged-in admin/seller user"),
      }),
    },
    safe(({ skuId, fileBase64, fileName, mimeType, productId, vtexAuthToken }) =>
      addSkuImageByFile(
        skuId,
        { buffer: Buffer.from(fileBase64, "base64"), name: fileName, type: mimeType },
        productId,
        vtexAuthToken
      )
    )
  );

  server.registerTool(
    "vtex_add_product_image",
    {
      title: "Attach an already-hosted image to a product",
      description:
        "PUT /api/catalog-seller-portal/products/{productId} — appends an image (must already be a vtexassets.com URL) to the product and all its SKUs.",
      inputSchema: z.object({
        productId: z.number().int(),
        imageUrl: z.string().url(),
        imageName: z.string().optional(),
      }),
    },
    safe(({ productId, imageUrl, imageName }) =>
      addProductImageViaSellerPortal(productId, imageUrl, imageName)
    )
  );

  server.registerTool(
    "vtex_get_sku_images",
    {
      title: "Get product images",
      description: "GET /api/catalog-seller-portal/products/{productId} — lists all images for a product.",
      inputSchema: z.object({
        skuId: z.number().int().describe("Unused by the Seller Portal API but kept for API symmetry"),
        productId: z.number().int(),
      }),
    },
    safe(({ skuId, productId }) => getSkuImages(skuId, productId))
  );

  server.registerTool(
    "vtex_delete_sku_image",
    {
      title: "Delete a product image",
      description:
        "Re-PUTs the product (Seller Portal API) without the image at the given 1-based index, removing it from the product and all SKUs that reference it.",
      inputSchema: z.object({
        skuId: z.number().int().describe("Unused by the Seller Portal API but kept for API symmetry"),
        imageIndex: z.number().int().min(1).describe("1-based index, as returned by vtex_get_sku_images"),
        productId: z.number().int(),
      }),
    },
    safe(({ skuId, imageIndex, productId }) => deleteSkuImage(skuId, imageIndex, productId))
  );

  // ─── Categories ────────────────────────────────────────────────────────

  server.registerTool(
    "vtex_list_categories",
    {
      title: "Get category tree",
      description: "GET /api/catalog_system/pvt/category/tree/2 — department + category tree (depth 2).",
    },
    safeNoArgs(getSellerCategories)
  );

  server.registerTool(
    "vtex_create_category",
    {
      title: "Create category",
      description:
        "POST /api/catalog-seller-portal/category-tree/categories — creates a root category (parentCategoryId: null) or subcategory.",
      inputSchema: z.object({
        name: z.string(),
        parentCategoryId: z.number().int().nullable(),
        isActive: z.boolean().optional(),
        description: z.string().optional(),
      }),
    },
    safe(createSellerCategory)
  );

  // ─── Brands ────────────────────────────────────────────────────────────

  server.registerTool(
    "vtex_list_brands",
    {
      title: "List brands",
      description:
        "Merges brands from the Seller Portal API, the classic catalog_system public brand list, and unique brands found in product data — the most complete view available on seller-only accounts.",
    },
    safeNoArgs(getSellerBrands)
  );

  server.registerTool(
    "vtex_create_brand",
    {
      title: "Create brand",
      description:
        "POST /api/catalog-seller-portal/brands, then best-effort PUT /api/catalog/pvt/brand/{id} to add SEO fields (silently skipped if the classic API 500s).",
      inputSchema: brandFields,
    },
    safe(createSellerBrand)
  );

  server.registerTool(
    "vtex_update_brand",
    {
      title: "Update brand",
      description:
        "PUT /api/catalog-seller-portal/brands/{id}, then best-effort PUT /api/catalog/pvt/brand/{id} to update SEO fields.",
      inputSchema: brandFields.extend({ id: z.number().int() }),
    },
    safe(({ id, ...data }) => updateSellerBrand(id, data))
  );

  server.registerTool(
    "vtex_delete_brand",
    {
      title: "Delete brand",
      description: "DELETE /api/catalog/pvt/brand/{id} — classic Catalog API (no Seller Portal delete endpoint exists).",
      inputSchema: z.object({ id: z.number().int() }),
    },
    safe(({ id }) => deleteSellerBrand(id))
  );

  // ─── Pricing ───────────────────────────────────────────────────────────

  server.registerTool(
    "vtex_get_sku_price",
    {
      title: "Get SKU price",
      description: "GET /api/pricing/prices/{skuId}",
      inputSchema: z.object({ skuId: z.string() }),
    },
    safe(({ skuId }) => getSkuPrice(skuId))
  );

  server.registerTool(
    "vtex_set_sku_price",
    {
      title: "Set SKU price",
      description:
        "PUT /api/pricing/prices/{skuId} — listPrice and basePrice are decimal EUR values (not cents).",
      inputSchema: z.object({
        skuId: z.string(),
        listPrice: z.number(),
        basePrice: z.number(),
        markup: z.number().optional(),
      }),
    },
    safe(({ skuId, listPrice, basePrice, markup }) =>
      setSkuPrice(skuId, { listPrice, basePrice, markup })
    )
  );

  // ─── Warehouses ────────────────────────────────────────────────────────

  server.registerTool(
    "vtex_list_warehouses",
    {
      title: "List warehouses",
      description: "GET /api/logistics/pvt/configuration/warehouses",
    },
    safeNoArgs(getSellerWarehouses)
  );

  server.registerTool(
    "vtex_create_warehouse",
    {
      title: "Create warehouse",
      description: "POST /api/logistics/pvt/configuration/warehouses",
      inputSchema: z.object({
        id: z.string(),
        name: z.string(),
        warehouseDocks: z.array(warehouseDock).optional(),
      }),
    },
    safe(createSellerWarehouse)
  );

  server.registerTool(
    "vtex_update_warehouse",
    {
      title: "Update warehouse",
      description: "PUT /api/logistics/pvt/configuration/warehouses/{id}",
      inputSchema: z.object({
        id: z.string(),
        name: z.string(),
        warehouseDocks: z.array(warehouseDock).optional(),
      }),
    },
    safe(({ id, ...data }) => updateSellerWarehouse(id, data))
  );

  server.registerTool(
    "vtex_delete_warehouse",
    {
      title: "Delete warehouse",
      description: "DELETE /api/logistics/pvt/configuration/warehouses/{id}",
      inputSchema: z.object({ id: z.string() }),
    },
    safe(({ id }) => deleteSellerWarehouse(id))
  );

  // ─── Inventory ─────────────────────────────────────────────────────────

  server.registerTool(
    "vtex_get_sku_inventory",
    {
      title: "Get SKU inventory balance",
      description: "GET /api/logistics/pvt/inventory/skus/{skuId} — balance across all warehouses.",
      inputSchema: z.object({ skuId: z.string() }),
    },
    safe(({ skuId }) => getSkuInventory(skuId))
  );

  server.registerTool(
    "vtex_set_sku_inventory",
    {
      title: "Set SKU inventory quantity",
      description: "PUT /api/logistics/pvt/inventory/skus/{skuId}/warehouses/{warehouseId}",
      inputSchema: z.object({
        skuId: z.string(),
        warehouseId: z.string(),
        quantity: z.number().int().min(0),
      }),
    },
    safe(({ skuId, warehouseId, quantity }) => setSkuInventory(skuId, warehouseId, quantity))
  );

  // ─── Docks ─────────────────────────────────────────────────────────────

  server.registerTool(
    "vtex_list_docks",
    {
      title: "List loading docks",
      description: "GET /api/logistics/pvt/configuration/docks",
    },
    safeNoArgs(getSellerDocks)
  );

  server.registerTool(
    "vtex_create_dock",
    {
      title: "Create loading dock",
      description: "POST /api/logistics/pvt/configuration/docks",
      inputSchema: z.object({
        id: z.string(),
        name: z.string(),
        warehouseIds: z.array(z.string()).optional(),
      }),
    },
    safe(createSellerDock)
  );

  server.registerTool(
    "vtex_update_dock",
    {
      title: "Update loading dock",
      description: "POST /api/logistics/pvt/configuration/docks/{dockId} (VTEX uses POST for dock updates)",
      inputSchema: z.object({
        dockId: z.string(),
        name: z.string(),
        warehouseIds: z.array(z.string()).optional(),
      }),
    },
    safe(({ dockId, ...data }) => updateSellerDock(dockId, data))
  );

  server.registerTool(
    "vtex_delete_dock",
    {
      title: "Delete loading dock",
      description: "DELETE /api/logistics/pvt/configuration/docks/{dockId}",
      inputSchema: z.object({ dockId: z.string() }),
    },
    safe(({ dockId }) => deleteSellerDock(dockId))
  );

  // ─── Shipping policies ─────────────────────────────────────────────────

  server.registerTool(
    "vtex_list_shipping_policies",
    {
      title: "List shipping policies (carriers)",
      description: "GET /api/logistics/pvt/configuration/carriers",
    },
    safeNoArgs(getShippingPolicies)
  );
}
