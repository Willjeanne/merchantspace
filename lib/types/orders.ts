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
