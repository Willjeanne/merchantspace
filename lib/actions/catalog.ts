"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  createSellerProduct,
  setSkuPrice,
  setSkuInventory,
  getSellerWarehouses,
  updateSellerProduct,
  updateSellerSku,
  addSkuImageByUrl,
  addSkuImageByFile,
  createSellerBrand,
  updateSellerBrand,
  deleteSellerBrand,
  createSellerCategory,
} from "@/lib/vtex/catalog";
import type { CreateProductInput } from "@/lib/types/catalog";

// ─── State interfaces ─────────────────────────────────────────────────────────

export interface CreateProductState {
  error?: string;
  step?: string;
}

export interface UpdateProductState {
  error?: string;
  success?: boolean;
}

export interface UpdateSkuPriceState {
  error?: string;
  success?: boolean;
}

export interface UpdateSkuInventoryState {
  error?: string;
  success?: boolean;
}

export interface BrandActionState {
  error?: string;
  success?: boolean;
}

export interface CategoryActionState {
  error?: string;
  success?: boolean;
}

export interface AddImageState {
  error?: string;
  success?: boolean;
}

// ─── Create product ───────────────────────────────────────────────────────────

/**
 * Server Action — creates product → SKU → price → inventory in sequence.
 * Redirects to /catalog on success.
 */
export async function createProductAction(
  _prev: CreateProductState,
  formData: FormData
): Promise<CreateProductState> {
  const input: CreateProductInput = {
    productName: String(formData.get("productName") ?? "").trim(),
    categoryId: Number(formData.get("categoryId")),
    brandId: Number(formData.get("brandId")),
    refId: String(formData.get("refId") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    skuName: String(formData.get("skuName") ?? "").trim(),
    skuRefId: String(formData.get("skuRefId") ?? "").trim(),
    weightKg: Number(formData.get("weightKg") ?? 0),
    height: Number(formData.get("height") ?? 0),
    width: Number(formData.get("width") ?? 0),
    length: Number(formData.get("length") ?? 0),
    listPrice: Number(formData.get("listPrice") ?? 0),
    sellingPrice: Number(formData.get("sellingPrice") ?? 0),
    quantity: Number(formData.get("quantity") ?? 0),
  };

  if (!input.productName) return { error: "Product name is required" };
  if (!input.categoryId) return { error: "Category is required" };
  if (!input.brandId) return { error: "Brand is required" };
  if (!input.skuName) return { error: "SKU name is required" };
  if (input.sellingPrice <= 0) return { error: "Selling price must be greater than 0" };
  if (input.quantity < 0) return { error: "Stock quantity must be 0 or more" };

  // createSellerProduct now creates product + SKU atomically via the Seller Portal API.
  // This avoids the 500 errors from catalog/pvt/product on Seller Portal accounts.
  let productId: number;
  let skuId: number;
  try {
    const result = await createSellerProduct({
      Name: input.productName,
      CategoryId: input.categoryId,
      BrandId: input.brandId,
      RefId: input.refId || undefined,
      Description: input.description,
      IsActive: true,
      SkuName: input.skuName,
      SkuRefId: input.skuRefId || undefined,
      PackagedWeightKg: input.weightKg || 0.5,
      PackagedHeight: input.height || 10,
      PackagedWidth: input.width || 10,
      PackagedLength: input.length || 10,
    });
    productId = result.productId;
    skuId = result.skuId;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[createProductAction] product+SKU creation failed:", msg);
    return { error: `Failed to create product: ${msg}`, step: "product" };
  }

  // If Seller Portal didn't return a SKU ID (204 or no skus[] in response),
  // fall back to fetching the SKU via stockkeepingunitByProductId.
  if (!skuId) {
    try {
      const { vtexSellerFetch } = await import("@/lib/vtex/client");
      interface VtexSkuMini { Id: number }
      const skus = await vtexSellerFetch<VtexSkuMini[]>(
        `/api/catalog_system/pvt/sku/stockkeepingunitByProductId/${productId}`
      );
      skuId = Array.isArray(skus) && skus[0] ? skus[0].Id : 0;
    } catch {
      // price + inventory will just be skipped silently
    }
  }

  if (skuId) {
    try {
      await setSkuPrice(String(skuId), {
        listPrice: input.listPrice || input.sellingPrice,
        basePrice: input.sellingPrice,
      });
    } catch (err) {
      console.error("[createProductAction] price set failed:", err instanceof Error ? err.message : err);
    }

    if (input.quantity > 0) {
      try {
        const warehouses = await getSellerWarehouses();
        const warehouseId = warehouses[0]?.id;
        if (warehouseId) {
          await setSkuInventory(String(skuId), warehouseId, input.quantity);
        }
      } catch (err) {
        console.error("[createProductAction] inventory set failed:", err instanceof Error ? err.message : err);
      }
    }
  }

  revalidatePath("/catalog");
  redirect(`/catalog/${productId}`);
}

// ─── Update product ───────────────────────────────────────────────────────────

export async function updateProductAction(
  _prev: UpdateProductState,
  formData: FormData
): Promise<UpdateProductState> {
  const productId = Number(formData.get("productId"));
  if (!productId) return { error: "Missing product ID" };

  const productName = String(formData.get("productName") ?? "").trim();
  const categoryId = Number(formData.get("categoryId"));
  const brandId = Number(formData.get("brandId"));
  const refId = String(formData.get("refId") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const title = String(formData.get("title") ?? productName).trim();
  const isActive = formData.get("isActive") === "true";

  if (!productName) return { error: "Product name is required" };
  if (!categoryId) return { error: "Category is required" };
  if (!brandId) return { error: "Brand is required" };

  try {
    await updateSellerProduct(productId, {
      Name: productName,
      CategoryId: categoryId,
      BrandId: brandId,
      RefId: refId || null,
      Description: description,
      Title: title || productName,
      IsVisible: true,
      IsActive: isActive,
    });
    revalidatePath(`/catalog/${productId}`);
    revalidatePath("/catalog");
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[updateProductAction] failed:", msg);
    return { error: `Failed to update product: ${msg}` };
  }
}

// ─── Update SKU price ─────────────────────────────────────────────────────────

export async function updateSkuPriceAction(
  _prev: UpdateSkuPriceState,
  formData: FormData
): Promise<UpdateSkuPriceState> {
  const skuId = String(formData.get("skuId") ?? "").trim();
  const productId = String(formData.get("productId") ?? "").trim();
  const basePrice = Number(formData.get("basePrice"));
  const listPrice = Number(formData.get("listPrice") ?? 0);

  if (!skuId) return { error: "Missing SKU ID" };
  if (basePrice <= 0) return { error: "Price must be greater than 0" };

  try {
    await setSkuPrice(skuId, {
      basePrice,
      listPrice: listPrice > 0 ? listPrice : basePrice,
    });
    if (productId) revalidatePath(`/catalog/${productId}`);
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[updateSkuPriceAction] failed:", msg);
    return { error: `Failed to update price: ${msg}` };
  }
}

// ─── Update SKU inventory ─────────────────────────────────────────────────────

export async function updateSkuInventoryAction(
  _prev: UpdateSkuInventoryState,
  formData: FormData
): Promise<UpdateSkuInventoryState> {
  const skuId = String(formData.get("skuId") ?? "").trim();
  const warehouseId = String(formData.get("warehouseId") ?? "").trim();
  const productId = String(formData.get("productId") ?? "").trim();
  const quantity = parseInt(String(formData.get("quantity") ?? ""), 10);

  if (!skuId) return { error: "Missing SKU ID" };
  if (!warehouseId) return { error: "Missing warehouse ID" };
  if (isNaN(quantity) || quantity < 0) return { error: "Quantity must be 0 or more" };

  try {
    await setSkuInventory(skuId, warehouseId, quantity);
    if (productId) revalidatePath(`/catalog/${productId}`);
    revalidatePath("/fulfillment");
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[updateSkuInventoryAction] failed:", msg);
    return { error: `Failed to update inventory: ${msg}` };
  }
}

// ─── Add SKU image by URL ─────────────────────────────────────────────────────

export async function addSkuImageUrlAction(
  _prev: AddImageState,
  formData: FormData
): Promise<AddImageState> {
  const skuId = Number(formData.get("skuId"));
  const productIdNum = Number(formData.get("productId") ?? 0);
  const imageUrl = String(formData.get("imageUrl") ?? "").trim();

  if (!skuId) return { error: "Missing SKU ID" };
  if (!productIdNum) return { error: "Missing product ID" };
  if (!imageUrl) return { error: "Image URL is required" };

  // Basic URL validation
  try {
    new URL(imageUrl);
  } catch {
    return { error: "Invalid image URL" };
  }

  const rawName = imageUrl.split("?")[0].split("/").pop() ?? "image.jpg";
  const imageName = rawName || `image_${Date.now()}.jpg`;

  const cookieStore = await cookies();
  const vtexAuthToken = cookieStore.get("vtex_auth")?.value ?? "";
  if (!vtexAuthToken) return { error: "Session expired — please log in again" };

  try {
    await addSkuImageByUrl(skuId, imageUrl, imageName, productIdNum, vtexAuthToken);
    revalidatePath(`/catalog/${productIdNum}`);
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[addSkuImageUrlAction] failed:", msg);
    return { error: `Failed to add image: ${msg}` };
  }
}

// ─── Add SKU image by file upload ────────────────────────────────────────────

export async function addSkuImageFileAction(
  _prev: AddImageState,
  formData: FormData
): Promise<AddImageState> {
  const skuId = Number(formData.get("skuId"));
  const productIdNum = Number(formData.get("productId") ?? 0);
  const file = formData.get("file") as File | null;

  if (!skuId) return { error: "Missing SKU ID" };
  if (!productIdNum) return { error: "Missing product ID" };
  if (!file || file.size === 0) return { error: "No file selected" };

  const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    return { error: "Only JPEG, PNG, GIF and WebP images are supported" };
  }

  if (file.size > 5 * 1024 * 1024) {
    return { error: "Image must be under 5 MB" };
  }

  const cookieStore = await cookies();
  const vtexAuthToken = cookieStore.get("vtex_auth")?.value ?? "";
  if (!vtexAuthToken) return { error: "Session expired — please log in again" };

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    await addSkuImageByFile(skuId, { buffer, name: file.name, type: file.type }, productIdNum, vtexAuthToken);
    revalidatePath(`/catalog/${productIdNum}`);
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[addSkuImageFileAction] failed:", msg);
    return { error: `Failed to upload image: ${msg}` };
  }
}

// ─── Brand actions ────────────────────────────────────────────────────────────

export async function createBrandAction(
  _prev: BrandActionState,
  formData: FormData
): Promise<BrandActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const isActive = formData.get("isActive") !== "false";
  const siteTitle = String(formData.get("siteTitle") ?? "").trim() || undefined;
  const text = String(formData.get("text") ?? "").trim() || undefined;
  const keywords = String(formData.get("keywords") ?? "").trim() || undefined;
  const linkId = String(formData.get("linkId") ?? "").trim() || undefined;

  if (!name) return { error: "Brand name is required" };

  try {
    await createSellerBrand({ Name: name, IsActive: isActive, SiteTitle: siteTitle, Text: text, Keywords: keywords, LinkId: linkId });
    revalidatePath("/catalog");
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[createBrandAction] failed:", msg);
    return { error: `Failed to create brand: ${msg}` };
  }
}

export async function updateBrandAction(
  _prev: BrandActionState,
  formData: FormData
): Promise<BrandActionState> {
  const id = Number(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim();
  const isActive = formData.get("isActive") === "true";
  const siteTitle = String(formData.get("siteTitle") ?? "").trim() || undefined;
  const text = String(formData.get("text") ?? "").trim() || undefined;
  const keywords = String(formData.get("keywords") ?? "").trim() || undefined;
  const linkId = String(formData.get("linkId") ?? "").trim() || undefined;

  if (!id) return { error: "Missing brand ID" };
  if (!name) return { error: "Brand name is required" };

  try {
    await updateSellerBrand(id, { Name: name, IsActive: isActive, SiteTitle: siteTitle, Text: text, Keywords: keywords, LinkId: linkId });
    revalidatePath("/catalog");
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[updateBrandAction] failed:", msg);
    return { error: `Failed to update brand: ${msg}` };
  }
}

export async function deleteBrandAction(
  _prev: BrandActionState,
  formData: FormData
): Promise<BrandActionState> {
  const id = Number(formData.get("id"));
  if (!id) return { error: "Missing brand ID" };

  try {
    await deleteSellerBrand(id);
    revalidatePath("/catalog");
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[deleteBrandAction] failed:", msg);
    return { error: `Failed to delete brand: ${msg}` };
  }
}

// ─── Category actions ─────────────────────────────────────────────────────────

export async function createCategoryAction(
  _prev: CategoryActionState,
  formData: FormData
): Promise<CategoryActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const parentIdStr = String(formData.get("parentCategoryId") ?? "").trim();
  const parentCategoryId = parentIdStr ? Number(parentIdStr) : null;
  const isActive = formData.get("isActive") !== "false";
  const description = String(formData.get("description") ?? "").trim() || undefined;

  if (!name) return { error: "Category name is required" };

  try {
    await createSellerCategory({ name, parentCategoryId, isActive, description });
    revalidatePath("/catalog");
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[createCategoryAction] failed:", msg);
    return { error: `Failed to create category: ${msg}` };
  }
}
