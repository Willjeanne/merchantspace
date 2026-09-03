// ─────────────────────────────────────────────────────────────────────────────
// Order list (GET /api/oms/pvt/orders)
// Note: the `items` array is not returned by the list endpoint since Oct 2018
// ─────────────────────────────────────────────────────────────────────────────

export type OrderStatus =
  | "waiting-for-sellers-confirmation"
  | "payment-pending"
  | "payment-approved"
  | "ready-for-handling"
  | "handling"
  | "invoiced"
  | "canceled"
  | "window-to-cancel";

export interface VtexOrderSummary {
  orderId: string;
  creationDate: string;
  clientName: string;
  items: null; // not returned since Oct 2018
  totalValue: number; // in cents
  status: OrderStatus;
  statusDescription: string;
  sequence: string;
  salesChannel: string;
  affiliateId: string;
  origin: string;
  workflowIsInError: boolean;
}

export interface VtexOrdersListResponse {
  list: VtexOrderSummary[];
  paging: {
    total: number;
    pages: number;
    currentPage: number;
    perPage: number;
  };
  stats: { stats: Record<string, unknown> };
}

// ─────────────────────────────────────────────────────────────────────────────
// Order detail (GET /api/oms/pvt/orders/{orderId})
// ─────────────────────────────────────────────────────────────────────────────

export interface VtexOrderDetail {
  orderId: string;
  sequence: string;
  creationDate: string;
  lastChange: string;
  status: OrderStatus;
  statusDescription: string;
  value: number; // in cents
  clientProfileData: {
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    document: string | null;
    documentType: string | null;
    corporateName: string | null;
    tradeName: string | null;
    isCorporate: boolean;
  };
  shippingData: {
    address: {
      addressType: string;
      city: string;
      complement: string | null;
      country: string;
      neighborhood: string | null;
      number: string | null;
      postalCode: string;
      receiverName: string;
      state: string;
      street: string;
    } | null;
    logisticsInfo: Array<{
      selectedDeliveryChannel: string;
      selectedSla: string;
      shippingEstimate: string;
    }>;
  } | null;
  items: Array<{
    id: string;
    productId: string;
    name: string;
    skuName: string;
    quantity: number;
    price: number; // in cents
    listPrice: number;
    sellingPrice: number;
    imageUrl: string;
    seller: string;
    measurementUnit: string;
    unitMultiplier: number;
    refId: string | null;
    uniqueId: string;
  }>;
  totals: Array<{
    id: string;
    name: string;
    value: number; // in cents
  }>;
  paymentData: {
    transactions: Array<{
      payments: Array<{
        paymentSystemName: string;
        value: number;
        installments: number;
      }>;
    }>;
  } | null;
  sellers: Array<{
    id: string;
    name: string;
  }>;
  packageAttachment: {
    packages: unknown[];
  } | null;
  invoiceData: unknown | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Filter params
// ─────────────────────────────────────────────────────────────────────────────

export interface OrderListParams {
  q?: string;
  status?: OrderStatus;
  page?: number;
  perPage?: number;
  orderBy?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Seller-account orders (GET https://{seller}.../api/oms/pvt/orders)
//
// The seller account runs its OWN OMS, holding the fulfillment-side counterpart
// of each marketplace order — a different id and a different status vocabulary.
// Verified on franceretailer1388: marketplace `1636850500482-01`
// (`payment-approved`) is `FRN-1636850500005-01` (`waiting-seller-handling`)
// here. Only these ids are accepted by the order action endpoints.
//
// `status` is deliberately a plain string: `waiting-seller-handling` is absent
// from the marketplace `OrderStatus` union above, and VTEX documents that
// unknown statuses must be tolerated rather than rejected.
// ─────────────────────────────────────────────────────────────────────────────

export interface VtexSellerOrderSummary extends Omit<VtexOrderSummary, "status"> {
  status: string;
}

export interface VtexSellerOrdersListResponse
  extends Omit<VtexOrdersListResponse, "list"> {
  list: VtexSellerOrderSummary[];
}

export interface VtexSellerOrderDetail extends Omit<VtexOrderDetail, "status"> {
  status: string;
  /** Whether VTEX currently permits cancelling this order. */
  allowCancellation: boolean;
  /** Whether VTEX currently permits editing this order's items. */
  allowEdition: boolean;
  /** Empty on chain orders — the marketplace is named by `marketplaceServicesEndpoint`. */
  marketplaceOrderId: string;
  orderGroup: string;
  affiliateId: string;
  /** `"Chain"` on orders forwarded by a marketplace. */
  origin: string;
  /** Set once the marketplace authorized fulfillment; the order then awaits dispatch. */
  authorizedDate: string | null;
  invoicedDate: string | null;
}

export interface SellerOrderListParams extends Omit<OrderListParams, "status"> {
  status?: string;
}
