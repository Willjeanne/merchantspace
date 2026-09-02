import { vtexFetch, vtexSellerFetch, toQueryString } from "@/lib/vtex/client";
import type {
  VtexOrdersListResponse,
  VtexOrderDetail,
  OrderListParams,
  OrderStatus,
  VtexSellerOrdersListResponse,
  VtexSellerOrderDetail,
  SellerOrderListParams,
} from "@/lib/types/orders";

const DEFAULT_PER_PAGE = 20;

// Seller filter applied to all order queries by default
const SELLER_ID = process.env.VTEX_SELLER_ID;

/**
 * GET /api/oms/pvt/orders
 * Lists orders filtered by the configured seller (VTEX_SELLER_ID).
 */
export async function listOrders(
  params: OrderListParams = {}
): Promise<VtexOrdersListResponse> {
  const {
    q,
    status,
    page = 1,
    perPage = DEFAULT_PER_PAGE,
    orderBy = "creationDate,desc",
  } = params;

  const qs = toQueryString({
    orderBy,
    page,
    per_page: perPage,
    ...(q ? { q } : {}),
    ...(status ? { f_status: status } : {}),
    ...(SELLER_ID ? { f_sellerNames: SELLER_ID } : {}),
  });

  return vtexFetch<VtexOrdersListResponse>(`/api/oms/pvt/orders${qs}`, {
    cache: "no-store",
  });
}

/**
 * GET /api/oms/pvt/orders (no seller filter)
 * Used by the dashboard to show marketplace-wide KPIs.
 */
export async function listOrdersMarketplace(
  params: OrderListParams = {}
): Promise<VtexOrdersListResponse> {
  const {
    q,
    status,
    page = 1,
    perPage = DEFAULT_PER_PAGE,
    orderBy = "creationDate,desc",
  } = params;

  const qs = toQueryString({
    orderBy,
    page,
    per_page: perPage,
    ...(q ? { q } : {}),
    ...(status ? { f_status: status } : {}),
  });

  return vtexFetch<VtexOrdersListResponse>(`/api/oms/pvt/orders${qs}`, {
    cache: "no-store",
  });
}

/**
 * GET /api/oms/pvt/orders/{orderId}
 * Retrieves full order details.
 */
export async function getOrder(orderId: string): Promise<VtexOrderDetail> {
  return vtexFetch<VtexOrderDetail>(`/api/oms/pvt/orders/${encodeURIComponent(orderId)}`, {
    cache: "no-store",
  });
}

/** All statuses available for filtering in the UI */
export const ORDER_STATUSES: { value: OrderStatus; label: string }[] = [
  { value: "waiting-for-sellers-confirmation", label: "Awaiting Confirmation" },
  { value: "payment-pending", label: "Payment Pending" },
  { value: "payment-approved", label: "Payment Approved" },
  { value: "ready-for-handling", label: "Ready to Handle" },
  { value: "handling", label: "Handling" },
  { value: "invoiced", label: "Invoiced" },
  { value: "canceled", label: "Cancelled" },
  { value: "window-to-cancel", label: "Cancellation Window" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Seller-account OMS
//
// The functions above read the MARKETPLACE account. Their order ids are the
// marketplace-side ids and the action endpoints reject them. Everything below
// talks to the seller account's own OMS, whose ids (`FRN-...`) are the
// actionable ones. See VtexSellerOrderDetail for the id mapping.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET https://{seller}.../api/oms/pvt/orders
 * Lists the seller account's own (fulfillment-side) orders. No seller filter is
 * applied — every order in this account already belongs to this seller.
 */
export async function listSellerOrders(
  params: SellerOrderListParams = {}
): Promise<VtexSellerOrdersListResponse> {
  const {
    q,
    status,
    page = 1,
    perPage = DEFAULT_PER_PAGE,
    orderBy = "creationDate,desc",
  } = params;

  const qs = toQueryString({
    orderBy,
    page,
    per_page: perPage,
    ...(q ? { q } : {}),
    ...(status ? { f_status: status } : {}),
  });

  return vtexSellerFetch<VtexSellerOrdersListResponse>(`/api/oms/pvt/orders${qs}`);
}

/**
 * GET https://{seller}.../api/oms/pvt/orders/{orderId}
 * Full detail of a seller-account order, including the `allowCancellation` and
 * `allowEdition` flags that say which actions VTEX will currently accept.
 *
 * Unlike the list endpoint, this one does not depend on the order index, so it
 * reflects a status change immediately.
 */
export async function getSellerOrder(orderId: string): Promise<VtexSellerOrderDetail> {
  return vtexSellerFetch<VtexSellerOrderDetail>(
    `/api/oms/pvt/orders/${encodeURIComponent(orderId)}`
  );
}

/**
 * Outcome of an order workflow action, verified against the order itself rather
 * than inferred from the HTTP response.
 *
 * VTEX documents that `start-handling` must be validated by checking for an
 * exact `204`, and that it "can also respond with status 500" — i.e. a 2xx is
 * not proof the workflow moved. One unreproducible run on FRN-1636850500005-01
 * did return success with the order unchanged (every later attempt returns a
 * clean 400 / OMS003). Reporting a no-op as success is worse than failing, so
 * every action re-reads the order and reports what actually changed.
 *
 * Note the two distinct failure shapes: a rejected precondition throws (nothing
 * was attempted), while `ok: false` means VTEX was called and the order did not
 * move.
 */
export interface SellerOrderActionResult {
  /** True only when the order's status actually changed. */
  ok: boolean;
  /**
   * `"applied"` — the status changed, the action took effect.
   * `"accepted-pending"` — VTEX accepted the call but the OMS had not applied it
   * before the wait window elapsed. The action may still land; re-read the order
   * instead of retrying. Never retry an irreversible action on this outcome.
   */
  outcome: "applied" | "accepted-pending";
  action: string;
  orderId: string;
  statusBefore: string;
  statusAfter: string;
  /** Present when `ok` is false — what is known, and what to do next. */
  message?: string;
  order: VtexSellerOrderDetail;
}

/** Re-read schedule after a workflow action: ~10s total across three retries. */
const RECHECK_DELAYS_MS = [2000, 3000, 5000];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Reads the order back after an action, tolerating the OMS applying workflow
 * transitions asynchronously.
 *
 * Measured on FRN-1636850500005-01: an invoice notified at 10:35:36 was applied
 * to the order at 10:35:42. A single immediate re-read reported a false failure,
 * which on an irreversible action is an invitation to retry and double-notify.
 * Returns as soon as the status moves, or after the last delay.
 */
async function readOrderAfterAction(
  orderId: string,
  statusBefore: string
): Promise<VtexSellerOrderDetail> {
  let order = await getSellerOrder(orderId);
  for (const delay of RECHECK_DELAYS_MS) {
    if (order.status !== statusBefore) break;
    await sleep(delay);
    order = await getSellerOrder(orderId);
  }
  return order;
}

/**
 * POST https://{seller}.../api/oms/pvt/orders/{orderId}/start-handling
 * Asks the seller-account OMS to move the order into `handling`.
 *
 * Reads the order before and after so the caller is told whether the workflow
 * actually advanced. On chain orders (`origin: "Chain"`) already past
 * authorization, VTEX accepts the call and does nothing — see the note on
 * SellerOrderActionResult.
 */
export async function startHandlingSellerOrder(
  orderId: string
): Promise<SellerOrderActionResult> {
  const before = await getSellerOrder(orderId);

  await vtexSellerFetch<void>(
    `/api/oms/pvt/orders/${encodeURIComponent(orderId)}/start-handling`,
    { method: "POST" }
  );

  const order = await readOrderAfterAction(orderId, before.status);
  const ok = order.status !== before.status;

  return {
    ok,
    outcome: ok ? "applied" : "accepted-pending",
    action: "start-handling",
    orderId,
    statusBefore: before.status,
    statusAfter: order.status,
    ...(ok
      ? {}
      : {
          message:
            `VTEX accepted the request but the order was still "${order.status}" ` +
            `(${order.statusDescription}) after the recheck window. Do not retry — ` +
            `re-read the order with vtex_get_seller_order instead. On a chain order ` +
            `already authorized (authorizedDate=${order.authorizedDate ?? "null"}) ` +
            `start-handling is normally refused outright with OMS003.`,
        }),
    order,
  };
}

/** Body of POST /api/oms/pvt/orders/{orderId}/invoice, full-order `Output` case. */
interface InvoiceNotificationPayload {
  type: "Output";
  invoiceNumber: string;
  /**
   * Total in cents. The OpenAPI spec types this as a string while the rest of
   * the money fields are integers; sent as a number here, which is what the OMS
   * accepts in practice. A rejection would surface as a VtexApiError carrying
   * VTEX's own message, so this is a one-line fix if it ever bites.
   */
  invoiceValue: number;
  issuanceDate: string;
  items: Array<{ id: string; price: number; quantity: number }>;
}

export interface SellerOrderInvoiceResult extends SellerOrderActionResult {
  invoiceNumber: string;
  invoiceValue: number;
}

/** `INV-<sequence>-20260902T142312` — readable, and unique per second. */
function buildInvoiceNumber(sequence: string): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0];
  return `INV-${sequence}-${stamp}`;
}

/**
 * POST https://{seller}.../api/oms/pvt/orders/{orderId}/invoice
 * Notifies the invoice for a whole order — the seller dispatching it. This is
 * what moves an order out of `waiting-seller-handling` on this account:
 * `start-handling` is refused there with `OMS003` because it requires
 * `ready-for-handling`.
 *
 * Everything is derived from the order, so the caller supplies nothing but the
 * id. `items` are always sent (VTEX recommends it to avoid rounding errors) and
 * carry the UNIT price in cents — the OMS multiplies by quantity itself.
 *
 * Tracking is deliberately left out: it belongs in a later call, once a carrier
 * has actually provided it. Sending placeholders here would publish "PENDING"
 * as a tracking number to the customer.
 *
 * Irreversible: an `invoiced` order can no longer be cancelled without a return
 * invoice (`type: "Input"`), so an already-invoiced order is refused outright
 * rather than re-notified — calling again with the same invoiceNumber only
 * regenerates the receipt code, which is never what the caller meant.
 */
export async function invoiceSellerOrder(
  orderId: string,
  options: { invoiceNumber?: string } = {}
): Promise<SellerOrderInvoiceResult> {
  const before = await getSellerOrder(orderId);

  if (before.invoicedDate) {
    throw new Error(
      `Order ${orderId} was already invoiced on ${before.invoicedDate} (status ` +
        `"${before.status}"). Nothing was sent. Re-notifying the same invoice only ` +
        `regenerates its receipt code; invoicing cannot be undone.`
    );
  }
  if (!before.items?.length) {
    throw new Error(`Order ${orderId} has no items to invoice. Nothing was sent.`);
  }

  const invoiceNumber = options.invoiceNumber ?? buildInvoiceNumber(before.sequence);
  const payload: InvoiceNotificationPayload = {
    type: "Output",
    invoiceNumber,
    invoiceValue: before.value,
    issuanceDate: new Date().toISOString(),
    items: before.items.map((item) => ({
      id: item.id,
      price: item.price,
      quantity: item.quantity,
    })),
  };

  await vtexSellerFetch<unknown>(
    `/api/oms/pvt/orders/${encodeURIComponent(orderId)}/invoice`,
    { method: "POST", body: JSON.stringify(payload) }
  );

  const order = await readOrderAfterAction(orderId, before.status);
  const ok = order.status !== before.status;

  return {
    ok,
    outcome: ok ? "applied" : "accepted-pending",
    action: "invoice",
    orderId,
    invoiceNumber,
    invoiceValue: payload.invoiceValue,
    statusBefore: before.status,
    statusAfter: order.status,
    ...(ok
      ? {}
      : {
          message:
            `VTEX accepted invoice ${invoiceNumber} but the order was still ` +
            `"${order.status}" (invoicedDate=${order.invoicedDate ?? "null"}) after the ` +
            `recheck window. The invoice has most likely been registered and the OMS ` +
            `simply had not applied it yet. DO NOT invoice again — that would ` +
            `double-notify. Re-read the order with vtex_get_seller_order and check ` +
            `invoicedDate and packageAttachment.packages for invoice ${invoiceNumber}.`,
        }),
    order,
  };
}
