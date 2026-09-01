import { App } from "@modelcontextprotocol/ext-apps";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

const app = new App({ name: "Create Product", version: "1.0.0" });

const formEl = document.getElementById("form") as HTMLFormElement;
const resultEl = document.getElementById("result") as HTMLDivElement;
const errorEl = document.getElementById("error") as HTMLDivElement;
const submitBtn = document.getElementById("submit-btn") as HTMLButtonElement;
const categorySelect = document.getElementById("CategoryId") as HTMLSelectElement;
const brandSelect = document.getElementById("BrandId") as HTMLSelectElement;
const warehouseSelect = document.getElementById("WarehouseId") as HTMLSelectElement;

function showError(message: string) {
  errorEl.textContent = message;
  errorEl.style.display = "block";
}

function clearError() {
  errorEl.style.display = "none";
  errorEl.textContent = "";
}

function firstText(result: CallToolResult): string | undefined {
  return result.content?.find((c) => c.type === "text")?.text;
}

function parseCreated(text: string | undefined): { productId?: number; skuId?: number } {
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

/**
 * Renders the outcome of a create. `followUps` carries the per-step results of
 * the price/stock calls the form makes after the product exists — they can fail
 * independently of a successful create, so they're reported as extra lines
 * rather than flipping the whole thing to an error.
 */
function renderCreateResult(result: CallToolResult, followUps: string[] = []) {
  const text = firstText(result);
  if (result.isError) {
    formEl.style.display = "";
    showError(text ?? "Product creation failed.");
    return;
  }
  clearError();
  formEl.style.display = "none";
  resultEl.style.display = "block";
  const parsed = parseCreated(text);
  const summary = parsed.productId
    ? `Product ID: ${parsed.productId}${parsed.skuId ? ` · SKU ID: ${parsed.skuId}` : ""}`
    : (text ?? "Done.");
  resultEl.innerHTML = `<strong>Product created</strong>` + summary;
  // Follow-up lines can carry raw VTEX error text — append as text nodes, not markup.
  for (const line of followUps) {
    const div = document.createElement("div");
    div.textContent = line;
    resultEl.appendChild(div);
  }
}

/**
 * Runs one post-create call (price, stock) and describes how it went. The
 * product already exists at this point, so a failure here is reported next to
 * the success rather than thrown — the user needs to know which half landed.
 */
async function runFollowUp(
  successLabel: string,
  call: { name: string; arguments: Record<string, unknown> }
): Promise<string> {
  try {
    const result = await app.callServerTool(call);
    return result.isError
      ? `${successLabel} — failed: ${firstText(result) ?? "unknown error"}`
      : `${successLabel}.`;
  } catch (err) {
    return `${successLabel} — failed: ${err instanceof Error ? err.message : String(err)}`;
  }
}

// Populate flat option lists into a <select>, replacing the placeholder option.
function fillOptions(select: HTMLSelectElement, items: Array<{ value: string; label: string }>) {
  select.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = items.length > 0 ? "Select…" : "None found";
  select.appendChild(placeholder);
  for (const item of items) {
    const opt = document.createElement("option");
    opt.value = item.value;
    opt.textContent = item.label;
    select.appendChild(opt);
  }
}

// Flattens the VtexCategory tree (id, name, children[]) into "Parent > Child" labels.
function flattenCategories(
  categories: Array<{ id: number; name: string; children?: unknown[] }>,
  prefix = ""
): Array<{ value: string; label: string }> {
  const out: Array<{ value: string; label: string }> = [];
  for (const c of categories) {
    const label = prefix ? `${prefix} > ${c.name}` : c.name;
    out.push({ value: String(c.id), label });
    const children = (c as { children?: typeof categories }).children;
    if (Array.isArray(children) && children.length > 0) {
      out.push(...flattenCategories(children, label));
    }
  }
  return out;
}

async function loadPickers() {
  try {
    const [catResult, brandResult, warehouseResult] = await Promise.all([
      app.callServerTool({ name: "vtex_list_categories", arguments: {} }),
      app.callServerTool({ name: "vtex_list_brands", arguments: {} }),
      app.callServerTool({ name: "vtex_list_warehouses", arguments: {} }),
    ]);

    const categories = JSON.parse(firstText(catResult) ?? "[]");
    fillOptions(categorySelect, flattenCategories(categories));

    const brands = JSON.parse(firstText(brandResult) ?? "[]") as Array<{
      id: number;
      name: string;
      isActive: boolean;
    }>;
    fillOptions(
      brandSelect,
      brands.filter((b) => b.isActive).map((b) => ({ value: String(b.id), label: b.name }))
    );

    const warehouses = JSON.parse(firstText(warehouseResult) ?? "[]") as Array<{
      id: string;
      name: string;
      isActive: boolean;
    }>;
    const activeWarehouses = warehouses.filter((w) => w.isActive);
    fillOptions(
      warehouseSelect,
      activeWarehouses.map((w) => ({ value: w.id, label: w.name }))
    );
    // Most seller accounts have exactly one — preselect it so stock alone is enough.
    if (activeWarehouses.length === 1) warehouseSelect.value = activeWarehouses[0].id;
  } catch {
    // Host may restrict which tools this app can call — fall back to plain ID entry.
    categorySelect.outerHTML = `<input type="number" id="CategoryId" name="CategoryId" required placeholder="Category ID" />`;
    brandSelect.outerHTML = `<input type="number" id="BrandId" name="BrandId" required placeholder="Brand ID" />`;
    warehouseSelect.outerHTML = `<input id="WarehouseId" name="WarehouseId" placeholder="Warehouse ID" />`;
  }
}

let openedFromDirectCreate = false;

app.ontoolinput = (params) => {
  const args = params.arguments ?? {};
  // vtex_create_product always sets Name; the empty-arg trigger tool does not.
  openedFromDirectCreate = typeof args.Name === "string" && args.Name.length > 0;
};

app.ontoolresult = (result) => {
  if (openedFromDirectCreate) {
    renderCreateResult(result);
  }
};

formEl.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearError();
  submitBtn.disabled = true;

  const fd = new FormData(formEl);
  const str = (key: string) => String(fd.get(key) ?? "").trim();
  const num = (key: string) => Number(fd.get(key));

  const args = {
    Name: str("Name"),
    CategoryId: num("CategoryId"),
    BrandId: num("BrandId"),
    RefId: str("RefId") || undefined,
    Description: str("Description"),
    IsActive: fd.get("IsActive") === "on",
    SkuName: str("SkuName"),
    SkuRefId: str("SkuRefId") || undefined,
    PackagedWeightKg: num("PackagedWeightKg"),
    PackagedHeight: num("PackagedHeight"),
    PackagedWidth: num("PackagedWidth"),
    PackagedLength: num("PackagedLength"),
  };

  const price = str("Price") === "" ? undefined : num("Price");
  const quantity = str("Quantity") === "" ? undefined : num("Quantity");
  const warehouseId = str("WarehouseId");

  try {
    const result = await app.callServerTool({ name: "vtex_create_product", arguments: args });
    if (result.isError) {
      renderCreateResult(result);
      return;
    }

    // Price and stock are separate VTEX APIs, keyed on the SKU the create just
    // returned — so they can only run once it succeeded.
    const { skuId } = parseCreated(firstText(result));
    const followUps: string[] = [];

    if (skuId !== undefined && price !== undefined) {
      followUps.push(
        await runFollowUp(`Price set to ${price} EUR`, {
          name: "vtex_set_sku_price",
          arguments: { skuId: String(skuId), listPrice: price, basePrice: price },
        })
      );
    }

    if (skuId !== undefined && quantity !== undefined) {
      followUps.push(
        warehouseId === ""
          ? "Stock not set: no warehouse selected."
          : await runFollowUp(`Stock set to ${quantity}`, {
              name: "vtex_set_sku_inventory",
              arguments: { skuId: String(skuId), warehouseId, quantity },
            })
      );
    }

    renderCreateResult(result, followUps);
  } catch (err) {
    showError(err instanceof Error ? err.message : String(err));
  } finally {
    submitBtn.disabled = false;
  }
});

await app.connect();
void loadPickers();
