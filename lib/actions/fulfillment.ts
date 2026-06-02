"use server";

import { revalidatePath } from "next/cache";
import {
  setSkuInventory,
  createSellerWarehouse,
  updateSellerWarehouse,
  deleteSellerWarehouse,
  createSellerDock,
  updateSellerDock,
  deleteSellerDock,
} from "@/lib/vtex/catalog";

// ─── State interfaces ─────────────────────────────────────────────────────────

export interface UpdateStockState {
  error?: string;
  success?: string;
}

export interface WarehouseActionState {
  error?: string;
  success?: boolean;
}

export interface DockActionState {
  error?: string;
  success?: boolean;
}

// ─── Stock ────────────────────────────────────────────────────────────────────

/**
 * Server Action — update stock quantity for a SKU in a warehouse.
 */
export async function updateStockAction(
  _prev: UpdateStockState,
  formData: FormData
): Promise<UpdateStockState> {
  const skuId = String(formData.get("skuId") ?? "").trim();
  const warehouseId = String(formData.get("warehouseId") ?? "").trim();
  const quantityStr = String(formData.get("quantity") ?? "");
  const quantity = parseInt(quantityStr, 10);

  if (!skuId) return { error: "Missing SKU ID" };
  if (!warehouseId) return { error: "Missing warehouse ID" };
  if (isNaN(quantity) || quantity < 0)
    return { error: "Quantity must be 0 or more" };

  try {
    await setSkuInventory(skuId, warehouseId, quantity);
    revalidatePath("/fulfillment");
    return { success: `Stock updated to ${quantity} units` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[updateStockAction] failed:", msg);
    return { error: `Failed to update stock: ${msg}` };
  }
}

// ─── Warehouses ───────────────────────────────────────────────────────────────

export async function createWarehouseAction(
  _prev: WarehouseActionState,
  formData: FormData
): Promise<WarehouseActionState> {
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();

  if (!id) return { error: "Warehouse ID is required" };
  if (!name) return { error: "Warehouse name is required" };

  try {
    await createSellerWarehouse({ id, name, warehouseDocks: [] });
    revalidatePath("/fulfillment");
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[createWarehouseAction] failed:", msg);
    return { error: `Failed to create warehouse: ${msg}` };
  }
}

export async function updateWarehouseAction(
  _prev: WarehouseActionState,
  formData: FormData
): Promise<WarehouseActionState> {
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();

  if (!id) return { error: "Warehouse ID is required" };
  if (!name) return { error: "Warehouse name is required" };

  try {
    await updateSellerWarehouse(id, { name });
    revalidatePath("/fulfillment");
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[updateWarehouseAction] failed:", msg);
    return { error: `Failed to update warehouse: ${msg}` };
  }
}

export async function deleteWarehouseAction(
  _prev: WarehouseActionState,
  formData: FormData
): Promise<WarehouseActionState> {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "Warehouse ID is required" };

  try {
    await deleteSellerWarehouse(id);
    revalidatePath("/fulfillment");
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[deleteWarehouseAction] failed:", msg);
    return { error: `Failed to delete warehouse: ${msg}` };
  }
}

// ─── Docks ────────────────────────────────────────────────────────────────────

export async function createDockAction(
  _prev: DockActionState,
  formData: FormData
): Promise<DockActionState> {
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();

  if (!id) return { error: "Dock ID is required" };
  if (!name) return { error: "Dock name is required" };

  try {
    await createSellerDock({ id, name });
    revalidatePath("/fulfillment");
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[createDockAction] failed:", msg);
    return { error: `Failed to create dock: ${msg}` };
  }
}

export async function updateDockAction(
  _prev: DockActionState,
  formData: FormData
): Promise<DockActionState> {
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();

  if (!id) return { error: "Dock ID is required" };
  if (!name) return { error: "Dock name is required" };

  try {
    await updateSellerDock(id, { name });
    revalidatePath("/fulfillment");
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[updateDockAction] failed:", msg);
    return { error: `Failed to update dock: ${msg}` };
  }
}

export async function deleteDockAction(
  _prev: DockActionState,
  formData: FormData
): Promise<DockActionState> {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "Dock ID is required" };

  try {
    await deleteSellerDock(id);
    revalidatePath("/fulfillment");
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[deleteDockAction] failed:", msg);
    return { error: `Failed to delete dock: ${msg}` };
  }
}
