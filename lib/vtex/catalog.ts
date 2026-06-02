import { vtexSellerFetch, vtexFetch } from "@/lib/vtex/client";
import type {
  VtexProduct,
  VtexSku,
  VtexProductSearchResult,
  VtexCategory,
  VtexBrand,
  VtexPrice,
  VtexWarehouse,
  VtexInventoryBalance,
  VtexDock,
  VtexCarrier,
} from "@/lib/types/catalog";

// ─── Products ────────────────────────────────────────────────────────────────

export interface ListProductsParams {
  from?: number;
  to?: number;
  q?: string;
}

/** Product list item assembled from GetProductAndSkuIds + stockKeepingUnitById */
export interface VtexProductListItem {
  productId: number;
  name: string;
  refId: string | null;
  brandId: number;
  brandName: string;
  imageUrl: string | null;
  isSkuActive: boolean;
  skuCount: number;
  firstSkuId: number;
}

interface GetProductAndSkuIdsResponse {
  data: Record<string, number[]>; // productId → [skuId, ...]
  range: { total: number; from: number; to: number };
}

interface VtexSkuById {
  Id: number;
  ProductId: number;
  ProductName: string;
  ProductDescription: string | null;
  ProductRefId: string | null;
  BrandId: string;
  BrandName: string;
  CategoryId: number | null;
  IsActive: boolean;
  ImageUrl: string | null;
  SkuName: string;
  Dimension: {
    cubicweight: number;
    height: number;
    length: number;
    weight: number;
    width: number;
  } | null;
  AlternateIds: { Ean?: string; RefId?: string } | null;
}

/**
 * List products from seller catalog.
 *
 * Strategy (bypasses the search index — unreliable on seller-only accounts):
 * 1. GetProductAndSkuIds → product IDs + SKU IDs (direct DB)
 * 2. stockKeepingUnitById/{firstSkuId} → product name, brand, image, status
 */
export async function listSellerProducts(
  params: ListProductsParams = {}
): Promise<VtexProductListItem[]> {
  const { from = 0, to = 49 } = params;
  const pageSize = to - from + 1;
  const page = Math.floor(from / pageSize) + 1;

  const idsRes = await vtexSellerFetch<GetProductAndSkuIdsResponse>(
    `/api/catalog_system/pvt/products/GetProductAndSkuIds?page=${page}&pagesize=${pageSize}`
  );

  const entries = Object.entries(idsRes?.data ?? {});
  if (entries.length === 0) return [];

  const products = await Promise.all(
    entries.map(async ([productIdStr, skuIds]) => {
      const productId = Number(productIdStr);
      const firstSkuId = skuIds[0];
      if (!firstSkuId) return null;

      const sku = await vtexSellerFetch<VtexSkuById>(
        `/api/catalog_system/pvt/sku/stockKeepingUnitById/${firstSkuId}`
      );

      return {
        productId,
        name: sku.ProductName,
        refId: sku.ProductRefId,
        brandId: Number(sku.BrandId),
        brandName: sku.BrandName,
        imageUrl: sku.ImageUrl,
        isSkuActive: sku.IsActive,
        skuCount: skuIds.length,
        firstSkuId,
      } satisfies VtexProductListItem;
    })
  );

  return products.filter((p): p is VtexProductListItem => p !== null);
}

/**
 * Get single product by ID from seller catalog.
 * Falls back to SKU-based reconstruction if catalog/pvt/product returns 500.
 */
export async function getSellerProduct(productId: number): Promise<VtexProduct> {
  return vtexSellerFetch<VtexProduct>(`/api/catalog/pvt/product/${productId}`);
}

/**
 * Get a full product detail: product + all SKUs + prices + inventory.
 *
 * Strategy (most reliable first):
 * 1. stockkeepingunitByProductId/{productId} → ALL SKUs for this product directly
 *    (replaces GetProductAndSkuIds scan which only covers the first N paginated products)
 * 2. catalog/pvt/product/{id} → full VtexProduct (may fail with 500 on Seller Portal accounts)
 * 3. If #2 fails, reconstruct VtexProduct from the SKU data from step 1
 * 4. catalog/pvt/product/{id}/stockkeepingunit → full VtexSku with dimensions (may 500)
 * 5. If #4 fails, build VtexSku[] from the step 1 SKU data
 */
export async function getSellerProductFull(productId: number): Promise<{
  product: VtexProduct | null;
  skus: VtexSku[];
  prices: (VtexPrice | null)[];
  inventory: VtexInventoryBalance[][];
}> {
  // Step 1a: Get SKU IDs for this product via the direct per-product endpoint.
  // stockkeepingunitByProductId returns basic shape {Id, Name, Height, ...} — IDs only!
  // This avoids the GetProductAndSkuIds pagination issue (only first 200 products visible).
  type BasicSkuListItem = { Id: number };
  let skuIds: number[] = [];
  try {
    const res = await vtexSellerFetch<BasicSkuListItem[]>(
      `/api/catalog_system/pvt/sku/stockkeepingunitByProductId/${productId}`
    );
    skuIds = Array.isArray(res) ? res.map((s) => s.Id) : [];
  } catch {
    // If the direct call fails, fall back to scanning GetProductAndSkuIds
    try {
      const idsRes = await vtexSellerFetch<GetProductAndSkuIdsResponse>(
        `/api/catalog_system/pvt/products/GetProductAndSkuIds?page=1&pagesize=200`
      );
      skuIds = idsRes?.data?.[String(productId)] ?? [];
    } catch {
      // both strategies failed — skuIds stays []
    }
  }

  // Step 1b: Fetch full context for each SKU via stockKeepingUnitById.
  // This endpoint returns the FULL schema: ProductName, BrandId, SkuName, Dimension, etc.
  let skuDetails: VtexSkuById[] = [];
  if (skuIds.length > 0) {
    const results = await Promise.all(
      skuIds.map((id) =>
        vtexSellerFetch<VtexSkuById>(
          `/api/catalog_system/pvt/sku/stockKeepingUnitById/${id}`
        ).catch(() => null)
      )
    );
    skuDetails = results.filter((d): d is VtexSkuById => d !== null);
  }

  // Step 2: Try to get the full VtexProduct (may return 500 on Seller Portal accounts)
  let product: VtexProduct | null = await vtexSellerFetch<VtexProduct>(
    `/api/catalog/pvt/product/${productId}`
  ).catch(() => null);

  // Fallback: reconstruct VtexProduct from first SKU detail if GET failed
  if (!product && skuDetails.length > 0) {
    const first = skuDetails[0];
    product = {
      Id: productId,
      Name: first.ProductName,
      Description: first.ProductDescription ?? "",
      CategoryId: first.CategoryId ?? 0,
      BrandId: Number(first.BrandId),
      RefId: first.ProductRefId,
      Title: first.ProductName,
      IsActive: first.IsActive,
      IsVisible: true,
      LinkId: first.ProductName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      DepartmentId: 0,
      MetaTagDescription: "",
      Score: null,
    };
  }

  // Step 3: Try to get full VtexSku[] with dimensions from catalog/pvt endpoint
  let skus: VtexSku[] = await vtexSellerFetch<VtexSku[]>(
    `/api/catalog/pvt/product/${productId}/stockkeepingunit`
  ).then((r) => (Array.isArray(r) ? r : [])).catch(() => []);

  // Fallback: build VtexSku[] from skuDetails (full stockKeepingUnitById data)
  if (skus.length === 0 && skuDetails.length > 0) {
    skus = skuDetails.map((d) => ({
      Id: d.Id,
      ProductId: productId,
      IsActive: d.IsActive,
      Name: d.SkuName,
      RefId: d.AlternateIds?.RefId ?? "",
      PackagedHeight: d.Dimension?.height ?? 10,
      PackagedLength: d.Dimension?.length ?? 10,
      PackagedWidth: d.Dimension?.width ?? 10,
      PackagedWeightKg: d.Dimension?.weight ?? 0.5,
      Height: null,
      Length: null,
      Width: null,
      WeightKg: null,
      CubicWeight: d.Dimension?.cubicweight ?? 0,
      IsKit: false,
      CreationDate: "",
      RewardValue: null,
      EstimatedDateArrival: null,
      ManufacturerCode: "",
      CommercialConditionId: 1,
      MeasurementUnit: "un",
      UnitMultiplier: 1,
      ModalType: null,
      KitItensSellApart: false,
      Videos: [],
    }));
  }

  const [prices, inventory] = await Promise.all([
    Promise.all(skus.map((sku) => getSkuPrice(String(sku.Id)))),
    Promise.all(skus.map((sku) => getSkuInventory(String(sku.Id)))),
  ]);

  return { product, skus, prices, inventory };
}

/**
 * Update product fields. Fetches current data first to preserve un-edited fields.
 * Falls back to SKU-based reconstruction if catalog/pvt/product GET returns 500.
 */
export async function updateSellerProduct(
  productId: number,
  updates: Partial<VtexProduct>
): Promise<VtexProduct> {
  // Try to GET current product to preserve fields we don't overwrite
  let current: VtexProduct | null = await vtexSellerFetch<VtexProduct>(
    `/api/catalog/pvt/product/${productId}`
  ).catch(() => null);

  // If GET failed (e.g. 500 for admin-created products), reconstruct from SKU data
  if (!current) {
    const idsRes = await vtexSellerFetch<GetProductAndSkuIdsResponse>(
      `/api/catalog_system/pvt/products/GetProductAndSkuIds?page=1&pagesize=200`
    ).catch(() => null);
    const skuIds = idsRes?.data?.[String(productId)] ?? [];
    const firstSkuId = skuIds[0];

    if (firstSkuId) {
      const skuDetail = await vtexSellerFetch<VtexSkuById>(
        `/api/catalog_system/pvt/sku/stockKeepingUnitById/${firstSkuId}`
      ).catch(() => null);

      if (skuDetail) {
        // Build a minimal VtexProduct shell from available SKU data
        current = {
          Id: productId,
          Name: skuDetail.ProductName,
          Description: skuDetail.ProductDescription ?? "",
          CategoryId: skuDetail.CategoryId ?? updates.CategoryId ?? 0,
          BrandId: Number(skuDetail.BrandId),
          RefId: skuDetail.ProductRefId,
          Title: skuDetail.ProductName,
          IsActive: skuDetail.IsActive,
          IsVisible: true,
          LinkId: skuDetail.ProductName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, ""),
          DepartmentId: 0,
          MetaTagDescription: "",
          Score: null,
        };
      }
    }
  }

  if (!current) {
    throw new Error(
      `Could not fetch product ${productId} for update — product not found`
    );
  }

  const merged = { ...current, ...updates };
  return vtexSellerFetch<VtexProduct>(`/api/catalog/pvt/product/${productId}`, {
    method: "PUT",
    body: JSON.stringify(merged),
  });
}

/** Full Seller Portal product shape (GET + PUT body) */
interface SellerPortalProduct {
  id: string;
  status: string;
  name: string;
  brandId: string;
  categoryIds: string[];
  specs: Array<{ name: string; values: string[] }>;
  attributes: Array<{ name: string; value: string }>;
  slug: string;
  images: Array<{ id: string; url: string; alt?: string }>;
  skus: Array<{
    id?: string;
    name: string;
    isActive: boolean;
    weight: number;
    dimensions: { width: number; height: number; length: number };
    specs: Array<{ name: string; value: string }> | null;
    images: string[];
    ean?: string;
    externalId?: string;
    manufacturerCode?: string;
    description?: string;
  }>;
  origin: string;
  description?: string;
  externalId?: string;
  taxCode?: string | null;
  transportModal?: string | null;
}

/** Shape returned by catalog-seller-portal/products POST */
interface SellerPortalProductResponse {
  id: string;
  status?: string;
  name?: string;
  skus?: Array<{ id: string; name?: string; [key: string]: unknown }>;
  [key: string]: unknown;
}

/**
 * Create a new product + first SKU via the Seller Portal API.
 *
 * The classic catalog/pvt/product endpoint returns 500 on Seller Portal accounts.
 * This API creates both product and SKU atomically and is the correct API for seller accounts.
 *
 * Returns the classic integer product ID and first SKU ID extracted from the response.
 */
export async function createSellerProduct(data: {
  Name: string;
  CategoryId: number;
  BrandId: number;
  RefId?: string | null;
  Description: string;
  IsActive: boolean;
  // SKU fields
  SkuName: string;
  SkuRefId?: string;
  PackagedWeightKg: number;
  PackagedHeight: number;
  PackagedWidth: number;
  PackagedLength: number;
}): Promise<{ productId: number; skuId: number }> {
  const sellerAccount = process.env.VTEX_SELLER_ACCOUNT;
  if (!sellerAccount) throw new Error("VTEX_SELLER_ACCOUNT is not set");

  const slug = `/${data.Name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;

  const body: Record<string, unknown> = {
    status: data.IsActive ? "active" : "inactive",
    name: data.Name,
    brandId: String(data.BrandId),
    categoryIds: [String(data.CategoryId)],
    specs: [],
    attributes: [],
    slug,
    images: [],
    origin: sellerAccount,
    skus: [
      {
        name: data.SkuName,
        isActive: data.IsActive,
        // weight in grams (Seller Portal uses grams, not kg)
        weight: Math.max(1, Math.round(data.PackagedWeightKg * 1000)),
        dimensions: {
          width: data.PackagedWidth || 10,
          height: data.PackagedHeight || 10,
          length: data.PackagedLength || 10,
        },
        // single SKU → specs can be null
        specs: null,
        images: [],
        ...(data.SkuRefId ? { externalId: data.SkuRefId } : {}),
      },
    ],
  };

  if (data.Description) body.description = data.Description;
  if (data.RefId) body.externalId = data.RefId;

  const res = await vtexSellerFetch<SellerPortalProductResponse>(
    "/api/catalog-seller-portal/products",
    { method: "POST", body: JSON.stringify(body) }
  );

  const productId = Number(res.id);
  const skuId = Number(res.skus?.[0]?.id ?? 0);

  if (!productId || isNaN(productId)) {
    throw new Error(`Product created but could not parse product ID from response: ${JSON.stringify(res).slice(0, 200)}`);
  }

  return { productId, skuId };
}

// ─── SKUs ────────────────────────────────────────────────────────────────────

/**
 * Get all SKUs for a product.
 */
export async function getProductSkus(productId: number): Promise<VtexSku[]> {
  const res = await vtexSellerFetch<VtexSku[]>(
    `/api/catalog/pvt/product/${productId}/stockkeepingunit`
  );
  return Array.isArray(res) ? res : [];
}

/**
 * Create a SKU in the seller catalog.
 */
export async function createSellerSku(data: {
  ProductId: number;
  IsActive: boolean;
  Name: string;
  RefId: string;
  PackagedHeight: number;
  PackagedLength: number;
  PackagedWidth: number;
  PackagedWeightKg: number;
  MeasurementUnit: string;
  UnitMultiplier: number;
}): Promise<VtexSku> {
  return vtexSellerFetch<VtexSku>("/api/catalog/pvt/stockkeepingunit", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * Update an existing SKU.
 */
export async function updateSellerSku(
  skuId: number,
  updates: Partial<VtexSku>
): Promise<VtexSku> {
  const current = await vtexSellerFetch<VtexSku>(
    `/api/catalog/pvt/stockkeepingunit/${skuId}`
  );
  const merged = { ...current, ...updates };
  return vtexSellerFetch<VtexSku>(`/api/catalog/pvt/stockkeepingunit/${skuId}`, {
    method: "PUT",
    body: JSON.stringify(merged),
  });
}

// ─── Product Images (Seller Portal) ──────────────────────────────────────────
//
// Architecture constraints (confirmed via API docs + testing):
//
//   • PUT /api/catalog-seller-portal/products/{id}  REQUIRES vtexassets.com URLs.
//     It silently drops any other URL (returns 204, image never appears).
//   • POST /api/catalog/pvt/stockkeepingunit/{id}/file  is CatalogV1 only — 500 on
//     Seller Portal (CatalogV2) accounts.
//   • Direct PUT to vtexassets.com/arquivos/ is blocked by CloudFront WAF from
//     external server IPs.
//
// Solution: Upload through the VTEX IO vtex.catalog-images app service, which:
//   1. Accepts multipart/form-data with the user's VtexIdclientAutCookie token
//   2. Stores the image and returns a vtexassets.com URL
//   3. Runs on app.io.vtex.com (not CloudFront) — no IP restriction
//
// Flow for any upload:  buffer → uploadImageToCatalogImagesService → vtexassets URL
//                       → addProductImageViaSellerPortal (Seller Portal PUT)

/**
 * Upload an image buffer to the VTEX vtex.catalog-images IO service.
 * Returns the resulting vtexassets.com URL.
 *
 * Requires the user's VtexIdclientAutCookie session token (stored as vtex_auth cookie).
 */
async function uploadImageToCatalogImagesService(
  imageBuffer: Buffer | Uint8Array,
  filename: string,
  mimeType: string,
  vtexAuthToken: string
): Promise<string> {
  const account = process.env.VTEX_SELLER_ACCOUNT;
  if (!account) throw new Error("VTEX_SELLER_ACCOUNT is not set");

  // Sanitise filename — VTEX rejects special chars
  const ext = filename.split(".").pop()?.toLowerCase() ?? "jpg";
  const base = filename
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .slice(0, 60);
  const cleanName = `${base}-${Date.now()}.${ext}`;

  const formData = new FormData();
  const blob = new Blob([imageBuffer as unknown as ArrayBuffer], { type: mimeType });
  formData.append("file", blob, cleanName);

  // ── Strategy A: VTEX IO vtex.catalog-images service (app.io.vtex.com) ──────
  // This endpoint is used internally by the VTEX Admin Seller Portal UI.
  // It accepts any image, stores it in vtexassets.com, and returns the CDN URL.
  // Authentication via VtexIdclientAutCookie session token (not App Key/Token).
  const ioUrl = `https://app.io.vtex.com/vtex.catalog-images/v0/${account}/master/_v/image-upload`;
  try {
    const ioRes = await fetch(ioUrl, {
      method: "POST",
      headers: { "VtexIdclientAutCookie": vtexAuthToken },
      body: formData,
    });
    if (ioRes.ok) {
      const json = await ioRes.json() as Record<string, unknown>;
      const url = (json.imageUrl ?? json.url ?? json.fileUrl ?? json.Location) as string | undefined;
      if (url && typeof url === "string") return url;
    }
    const errText = await ioRes.text().catch(() => "");
    console.warn(`[catalog-images] IO service returned ${ioRes.status}: ${errText.slice(0, 200)}`);
  } catch (err) {
    console.warn("[catalog-images] IO service fetch failed:", err instanceof Error ? err.message : err);
  }

  // ── Strategy B: vtexassets.com/arquivos/ with session cookie ────────────────
  // Fallback: direct CDN upload. May be blocked by CloudFront WAF on some IPs.
  const cdnUrl = `https://${account}.vtexassets.com/arquivos/${cleanName}`;
  const cdnRes = await fetch(cdnUrl, {
    method: "PUT",
    headers: {
      "Cookie": `VtexIdclientAutCookie=${vtexAuthToken}`,
      "Content-Type": mimeType,
    },
    body: imageBuffer as unknown as BodyInit,
  });

  if (cdnRes.ok) return cdnUrl;

  const cdnBody = await cdnRes.text().catch(() => "");
  throw new Error(
    `Image upload to VTEX CDN failed (${cdnRes.status}). ` +
    `Ensure your VTEX session is active. Detail: ${cdnBody.slice(0, 150)}`
  );
}

/**
 * Add an image to an SKU by URL.
 *
 * Correct flow for Seller Portal (CatalogV2) accounts:
 * 1. Proxy-download the external image to our server buffer
 * 2. Upload to VTEX via the catalog-images IO service → get vtexassets.com URL
 * 3. PUT the product via Seller Portal API using the vtexassets.com URL
 *
 * Requires vtexAuthToken (user's VtexIdclientAutCookie from session cookie).
 */
export async function addSkuImageByUrl(
  skuId: number,
  imageUrl: string,
  imageName: string,
  productId: number,
  vtexAuthToken: string
): Promise<void> {
  // Step 1: Proxy-download the external image to an in-memory buffer
  let imageBuffer: Buffer;
  let mimeType = "image/jpeg";
  try {
    const imageRes = await fetch(imageUrl, {
      headers: { "User-Agent": "MerchantSpace/1.0 image-importer" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!imageRes.ok) {
      throw new Error(`Could not fetch image (${imageRes.status}): ${imageUrl}`);
    }
    mimeType = imageRes.headers.get("content-type")?.split(";")[0] ?? "image/jpeg";
    imageBuffer = Buffer.from(await imageRes.arrayBuffer());
  } catch (err) {
    throw new Error(`Failed to download image: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Step 2: Upload to VTEX catalog-images → get vtexassets.com URL
  const vtexImageUrl = await uploadImageToCatalogImagesService(
    imageBuffer,
    imageName,
    mimeType,
    vtexAuthToken
  );

  // Step 3: Update product via Seller Portal with the vtexassets.com URL
  await addProductImageViaSellerPortal(productId, vtexImageUrl, imageName);
}

/**
 * Add an image from a local file upload.
 *
 * Correct flow for Seller Portal (CatalogV2) accounts:
 * 1. Upload the file buffer to VTEX via catalog-images IO service → vtexassets.com URL
 * 2. PUT the product via Seller Portal API using the vtexassets.com URL
 *
 * Requires vtexAuthToken (user's VtexIdclientAutCookie from session cookie).
 */
export async function addSkuImageByFile(
  skuId: number,
  file: { buffer: Buffer | Uint8Array; name: string; type: string },
  productId: number,
  vtexAuthToken: string
): Promise<void> {
  // Step 1: Upload to VTEX catalog-images → get vtexassets.com URL
  const vtexImageUrl = await uploadImageToCatalogImagesService(
    file.buffer,
    file.name,
    file.type,
    vtexAuthToken
  );

  // Step 2: Update product via Seller Portal with the vtexassets.com URL
  await addProductImageViaSellerPortal(productId, vtexImageUrl, file.name);
}

/**
 * Add an image to a product via the Seller Portal PUT product endpoint.
 * VTEX fetches the image from the provided URL and stores it in its CDN.
 */
export async function addProductImageViaSellerPortal(
  productId: number,
  imageUrl: string,
  imageName?: string
): Promise<void> {
  // Step 1: GET current product state
  const current = await vtexSellerFetch<SellerPortalProduct>(
    `/api/catalog-seller-portal/products/${productId}`
  );

  // Step 2: Build a stable image ID from the filename
  const rawName = imageName ?? imageUrl.split("/").pop()?.split("?")[0] ?? `image-${Date.now()}`;
  // Remove extension from ID to use as reference
  const imageId = rawName.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "-");

  // Step 3: Append new image to product-level images array
  const updatedImages: SellerPortalProduct["images"] = [
    ...(current.images ?? []),
    { id: imageId, url: imageUrl, alt: imageId },
  ];

  // Step 4: Update all SKUs to reference the new image
  const updatedSkus = (current.skus ?? []).map((sku) => ({
    ...sku,
    images: [...(sku.images ?? []), imageId],
  }));

  // Step 5: PUT the full updated product
  await vtexSellerFetch(`/api/catalog-seller-portal/products/${productId}`, {
    method: "PUT",
    body: JSON.stringify({
      ...current,
      images: updatedImages,
      skus: updatedSkus,
    }),
  });
}

/**
 * Get all images for a product via the Seller Portal API.
 * Returns in the same shape expected by the product detail page.
 */
export async function getSkuImages(
  _skuId: number,
  productId?: number
): Promise<Array<{ Id: number; IsMain: boolean; Label: string; Name: string; Url: string }>> {
  if (!productId) return [];
  try {
    const product = await vtexSellerFetch<SellerPortalProduct>(
      `/api/catalog-seller-portal/products/${productId}`
    );
    return (product.images ?? []).map((img, i) => ({
      Id: i + 1,
      IsMain: i === 0,
      Label: img.alt ?? img.id,
      Name: img.id,
      Url: img.url,
    }));
  } catch {
    return [];
  }
}

/**
 * Delete a product image by index (Seller Portal: re-PUT without that image).
 */
export async function deleteSkuImage(
  _skuId: number,
  imageIndex: number,
  productId?: number
): Promise<void> {
  if (!productId) throw new Error("productId required");
  const current = await vtexSellerFetch<SellerPortalProduct>(
    `/api/catalog-seller-portal/products/${productId}`
  );
  const removedId = current.images?.[imageIndex - 1]?.id; // Id is 1-based from getSkuImages
  const updatedImages = (current.images ?? []).filter((_, i) => i !== imageIndex - 1);
  const updatedSkus = (current.skus ?? []).map((sku) => ({
    ...sku,
    images: removedId ? sku.images.filter((id) => id !== removedId) : sku.images,
  }));
  await vtexSellerFetch(`/api/catalog-seller-portal/products/${productId}`, {
    method: "PUT",
    body: JSON.stringify({ ...current, images: updatedImages, skus: updatedSkus }),
  });
}

// ─── Categories ──────────────────────────────────────────────────────────────

/**
 * Get category tree (depth=2 for department + category).
 */
export async function getSellerCategories(): Promise<VtexCategory[]> {
  const res = await vtexSellerFetch<VtexCategory[]>(
    "/api/catalog_system/pvt/category/tree/2"
  );
  return Array.isArray(res) ? res : [];
}

/**
 * Create a category via the Seller Portal API.
 * Body: { parentId, Name } — correct for seller accounts.
 * For root categories, parentId must be null.
 */
export async function createSellerCategory(data: {
  name: string;
  parentCategoryId: number | null;
  isActive?: boolean;
  description?: string;
}): Promise<{ Id: number; Name: string }> {
  const res = await vtexSellerFetch<{ id: string; name: string }>(
    "/api/catalog-seller-portal/category-tree/categories",
    {
      method: "POST",
      body: JSON.stringify({
        Name: data.name,
        parentId: data.parentCategoryId ? String(data.parentCategoryId) : null,
        isActive: data.isActive !== false,
        ...(data.description ? { description: data.description } : {}),
      }),
    }
  );
  return { Id: Number(res.id), Name: res.name };
}

// ─── Brands ──────────────────────────────────────────────────────────────────

/** Seller Portal brand response shape */
interface SellerPortalBrand {
  id: string;
  name: string;
  isActive: boolean;
}

interface SellerPortalBrandListResponse {
  data?: SellerPortalBrand[];
  items?: SellerPortalBrand[];
}

/**
 * Get all brands in seller catalog.
 *
 * Strategy order:
 * 1. Seller Portal API (catalog-seller-portal/brands) — works on seller accounts
 * 2. Classic catalog_system brand list — often returns 500 on seller-only accounts
 * 3. Extract unique brands from existing product SKU data as last resort
 */
export async function getSellerBrands(): Promise<VtexBrand[]> {
  // Run Strategy 1 (Seller Portal) and Strategy 2 (Classic) in parallel,
  // then merge — the Seller Portal API only returns brands it "owns" while
  // catalog_system/pub/brand/list returns the rest.
  const brandMap = new Map<number, VtexBrand>();

  // Strategy 1: Seller Portal API
  try {
    const res = await vtexSellerFetch<SellerPortalBrandListResponse | SellerPortalBrand[]>(
      "/api/catalog-seller-portal/brands?from=0&to=100"
    );
    const items: SellerPortalBrand[] = Array.isArray(res)
      ? res
      : (res as SellerPortalBrandListResponse).data ?? (res as SellerPortalBrandListResponse).items ?? [];
    for (const b of items) {
      const id = Number(b.id);
      brandMap.set(id, {
        id,
        name: b.name,
        isActive: b.isActive,
        title: null,
        metaTagDescription: null,
        imageUrl: null,
      });
    }
  } catch {
    // fallthrough
  }

  // Strategy 2a: classic public brand list (pvt returns 500 on seller accounts)
  try {
    interface ClassicBrand { Id: number; Name: string; IsActive: boolean; Title?: string | null; MetaTagDescription?: string | null; ImageUrl?: string | null }
    const res = await vtexSellerFetch<ClassicBrand[]>("/api/catalog_system/pub/brand/list");
    if (Array.isArray(res)) {
      for (const b of res) {
        if (!brandMap.has(b.Id)) {
          brandMap.set(b.Id, {
            id: b.Id,
            name: b.Name,
            isActive: b.IsActive,
            title: b.Title ?? null,
            metaTagDescription: b.MetaTagDescription ?? null,
            imageUrl: b.ImageUrl ?? null,
          });
        }
      }
    }
  } catch {
    // fallthrough
  }

  // Strategy 3: always run to fill in brands missing from the above APIs
  // (Seller Portal API only returns a subset; classic list returns 500 on seller accounts)
  try {
    const products = await listSellerProducts({ from: 0, to: 99 });
    for (const p of products) {
      if (p.brandId > 0 && !brandMap.has(p.brandId)) {
        brandMap.set(p.brandId, {
          id: p.brandId,
          name: p.brandName,
          isActive: true,
          title: null,
          metaTagDescription: null,
          imageUrl: null,
        });
      }
    }
  } catch {
    // fallthrough
  }

  return [...brandMap.values()].sort((a, b) => a.id - b.id);
}

/**
 * Create a brand.
 * Step 1: Seller Portal API (name + isActive) — always works on seller accounts.
 * Step 2: Classic API PUT to add SEO fields (SiteTitle, Text, Keywords, LinkId).
 *         This is a best-effort enhancement — it silently skips if the classic API 500s.
 */
export async function createSellerBrand(data: {
  Name: string;
  IsActive: boolean;
  SiteTitle?: string;
  Text?: string;
  Keywords?: string;
  LinkId?: string;
}): Promise<VtexBrand> {
  const res = await vtexSellerFetch<SellerPortalBrand>(
    "/api/catalog-seller-portal/brands",
    {
      method: "POST",
      body: JSON.stringify({
        name: data.Name,
        isActive: data.IsActive,
      }),
    }
  );

  const brandId = Number(res.id);

  // Best-effort: try to enrich with SEO fields via classic API
  if (data.SiteTitle || data.Text || data.Keywords || data.LinkId) {
    try {
      await vtexSellerFetch(`/api/catalog/pvt/brand/${brandId}`, {
        method: "PUT",
        body: JSON.stringify({
          Id: brandId,
          Name: data.Name,
          Active: data.IsActive,
          SiteTitle: data.SiteTitle ?? data.Name,
          Text: data.Text ?? "",
          Keywords: data.Keywords ?? "",
          LinkId: data.LinkId ?? data.Name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          Score: null,
        }),
      });
    } catch {
      // Classic API may 500 on Seller Portal accounts — silently skip
    }
  }

  return {
    id: brandId,
    name: res.name,
    isActive: res.isActive,
    title: data.SiteTitle ?? null,
    metaTagDescription: data.Text ?? null,
    imageUrl: null,
  };
}

/**
 * Update a brand.
 * Step 1: Seller Portal API (name + isActive).
 * Step 2: Classic API best-effort for SEO fields.
 */
export async function updateSellerBrand(
  id: number,
  data: { Name: string; IsActive: boolean; SiteTitle?: string; Text?: string; Keywords?: string; LinkId?: string }
): Promise<void> {
  await vtexSellerFetch(`/api/catalog-seller-portal/brands/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      id: String(id),
      name: data.Name,
      isActive: data.IsActive,
    }),
  });

  // Best-effort SEO fields via classic API
  if (data.SiteTitle || data.Text || data.Keywords || data.LinkId) {
    try {
      await vtexSellerFetch(`/api/catalog/pvt/brand/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          Id: id,
          Name: data.Name,
          Active: data.IsActive,
          SiteTitle: data.SiteTitle ?? data.Name,
          Text: data.Text ?? "",
          Keywords: data.Keywords ?? "",
          LinkId: data.LinkId ?? data.Name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          Score: null,
        }),
      });
    } catch {
      // Silently skip if classic API unavailable
    }
  }
}

/**
 * Delete a brand (classic Catalog API — no Seller Portal delete endpoint exists).
 */
export async function deleteSellerBrand(id: number): Promise<void> {
  await vtexSellerFetch(`/api/catalog/pvt/brand/${id}`, {
    method: "DELETE",
  });
}

// ─── Pricing ─────────────────────────────────────────────────────────────────

/**
 * Get price for a specific SKU.
 */
export async function getSkuPrice(skuId: string): Promise<VtexPrice | null> {
  try {
    return await vtexSellerFetch<VtexPrice>(`/api/pricing/prices/${skuId}`);
  } catch {
    return null;
  }
}

/**
 * Set price for a SKU. listPrice and basePrice are in EUR (decimals).
 * VTEX Pricing API uses decimal values (not cents).
 */
export async function setSkuPrice(
  skuId: string,
  data: { listPrice: number; basePrice: number; markup?: number }
): Promise<VtexPrice> {
  return vtexSellerFetch<VtexPrice>(`/api/pricing/prices/${skuId}`, {
    method: "PUT",
    body: JSON.stringify({
      listPrice: data.listPrice,
      costPrice: data.basePrice,
      markup: data.markup ?? 0,
      basePrice: data.basePrice,
    }),
  });
}

// ─── Inventory ───────────────────────────────────────────────────────────────

/**
 * Get all warehouses for the seller account.
 */
export async function getSellerWarehouses(): Promise<VtexWarehouse[]> {
  const res = await vtexSellerFetch<VtexWarehouse[]>(
    "/api/logistics/pvt/configuration/warehouses"
  );
  return Array.isArray(res) ? res : [];
}

/**
 * Create a warehouse.
 */
export async function createSellerWarehouse(data: {
  id: string;
  name: string;
  warehouseDocks?: Array<{ dockId: string; time: string; cost: string }>;
}): Promise<VtexWarehouse> {
  return vtexSellerFetch<VtexWarehouse>(
    "/api/logistics/pvt/configuration/warehouses",
    {
      method: "POST",
      body: JSON.stringify({
        id: data.id,
        name: data.name,
        warehouseDocks: data.warehouseDocks ?? [],
      }),
    }
  );
}

/**
 * Update a warehouse.
 */
export async function updateSellerWarehouse(
  id: string,
  data: { name: string; warehouseDocks?: Array<{ dockId: string; time: string; cost: string }> }
): Promise<void> {
  await vtexSellerFetch(
    `/api/logistics/pvt/configuration/warehouses/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      body: JSON.stringify({
        id,
        name: data.name,
        warehouseDocks: data.warehouseDocks ?? [],
      }),
    }
  );
}

/**
 * Delete a warehouse.
 */
export async function deleteSellerWarehouse(id: string): Promise<void> {
  await vtexSellerFetch(
    `/api/logistics/pvt/configuration/warehouses/${encodeURIComponent(id)}`,
    { method: "DELETE" }
  );
}

/**
 * Get inventory balance for a SKU across all warehouses.
 */
export async function getSkuInventory(
  skuId: string
): Promise<VtexInventoryBalance[]> {
  try {
    const res = await vtexSellerFetch<{ balance: VtexInventoryBalance[] }>(
      `/api/logistics/pvt/inventory/skus/${skuId}`
    );
    return res?.balance ?? [];
  } catch {
    return [];
  }
}

/**
 * Set inventory quantity for a SKU in a specific warehouse.
 */
export async function setSkuInventory(
  skuId: string,
  warehouseId: string,
  quantity: number
): Promise<void> {
  await vtexSellerFetch(
    `/api/logistics/pvt/inventory/skus/${skuId}/warehouses/${warehouseId}`,
    {
      method: "PUT",
      body: JSON.stringify({
        unlimitedQuantity: false,
        quantity,
        dateUtcOnBalanceSystem: null,
      }),
    }
  );
}

// ─── Docks ───────────────────────────────────────────────────────────────────

/**
 * Get all loading docks for the seller account.
 */
export async function getSellerDocks(): Promise<VtexDock[]> {
  try {
    const res = await vtexSellerFetch<VtexDock[]>(
      "/api/logistics/pvt/configuration/docks"
    );
    return Array.isArray(res) ? res : [];
  } catch {
    return [];
  }
}

/**
 * Create a loading dock.
 */
export async function createSellerDock(data: {
  id: string;
  name: string;
  warehouseIds?: string[];
}): Promise<void> {
  await vtexSellerFetch("/api/logistics/pvt/configuration/docks", {
    method: "POST",
    body: JSON.stringify({
      id: data.id,
      name: data.name,
      priority: 0,
      dockTimeFake: "00:00:00",
      timeFakeOverhead: "00:00:00",
      salesChannels: [{ id: "1" }],
      warehouseIds: data.warehouseIds ?? [],
      wmsEndPoint: "",
      pickupStoreInfo: { isPickupStore: false, storeId: null },
    }),
  });
}

/**
 * Update a loading dock.
 */
export async function updateSellerDock(
  dockId: string,
  data: { name: string; warehouseIds?: string[] }
): Promise<void> {
  await vtexSellerFetch(
    `/api/logistics/pvt/configuration/docks/${encodeURIComponent(dockId)}`,
    {
      method: "POST",
      body: JSON.stringify({
        id: dockId,
        name: data.name,
        priority: 0,
        dockTimeFake: "00:00:00",
        timeFakeOverhead: "00:00:00",
        salesChannels: [{ id: "1" }],
        warehouseIds: data.warehouseIds ?? [],
        wmsEndPoint: "",
        pickupStoreInfo: { isPickupStore: false, storeId: null },
      }),
    }
  );
}

/**
 * Delete a loading dock.
 */
export async function deleteSellerDock(dockId: string): Promise<void> {
  await vtexSellerFetch(
    `/api/logistics/pvt/configuration/docks/${encodeURIComponent(dockId)}`,
    { method: "DELETE" }
  );
}

// ─── Shipping Policies (Carriers) ────────────────────────────────────────────

/**
 * Get shipping policies (carriers) for the seller account.
 */
export async function getShippingPolicies(): Promise<VtexCarrier[]> {
  try {
    const res = await vtexSellerFetch<VtexCarrier[]>(
      "/api/logistics/pvt/configuration/carriers"
    );
    return Array.isArray(res) ? res : [];
  } catch {
    return [];
  }
}
