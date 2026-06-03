// ─── Payments / Payouts types ─────────────────────────────────────────────────

export type PayoutStatus = "scheduled" | "processing" | "paid" | "failed";
export type SplitStatus = "pending" | "available" | "paid";

export interface WalletBalance {
  total: number;       // gross total from all invoiced orders
  pending: number;     // in retraction hold / awaiting delivery confirmation
  available: number;   // ready for disbursement
}

// ─── Order split ──────────────────────────────────────────────────────────────

export interface OrderSplit {
  orderId: string;
  orderDate: string;
  invoicedDate: string;
  grossAmount: number;
  commissionRate: number;       // % e.g. 12.5
  commissionAmount: number;
  pspFeeRate: number;           // % e.g. 1.5
  pspFeeAmount: number;
  netAmount: number;
  status: SplitStatus;
  availableDate: string;        // when hold expires
}

// ─── Payout calendar entry ───────────────────────────────────────────────────

export interface PayoutEntry {
  id: string;
  amount: number;
  currency: string;
  estimatedDate: string;
  status: PayoutStatus;
  orderCount: number;
  reference: string;
}

// ─── Reconciliation line ─────────────────────────────────────────────────────

export interface ReconciliationLine {
  orderId: string;
  date: string;
  sku: string;
  productName: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  commission: number;
  pspFee: number;
  refund: number;
  chargeback: number;
  net: number;
}

// ─── Commission (native VTEX) ─────────────────────────────────────────────────

export interface SellerCommission {
  categoryId: string;
  categoryFullPath: string;
  productCommissionPercentage: number;
  freightCommissionPercentage: number;
}

// ─── DAC7 ─────────────────────────────────────────────────────────────────────

export interface Dac7Data {
  year: number;
  cumulativeRevenue: number;
  transactionCount: number;
  revenueThreshold: number;   // 2000 EUR
  transactionThreshold: number; // 30
  declarationRequired: boolean;
  declarationSubmitted: boolean;
}
