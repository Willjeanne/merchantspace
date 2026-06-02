import { vtexFetch, toQueryString } from "@/lib/vtex/client";
import type {
  VtexOrdersListResponse,
  VtexOrderDetail,
  OrderListParams,
  OrderStatus,
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
