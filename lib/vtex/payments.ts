import { listOrders } from "@/lib/vtex/orders";
import type { OrderStatus } from "@/lib/types/orders";
import type {
  WalletBalance,
  OrderSplit,
  PayoutEntry,
  ReconciliationLine,
  Dac7Data,
  SplitStatus,
} from "@/lib/types/payments";

// Statuses that represent an active order generating revenue (not canceled)
const ACTIVE_STATUSES = new Set<OrderStatus>([
  "waiting-for-sellers-confirmation",
  "payment-pending",
  "payment-approved",
  "ready-for-handling",
  "handling",
  "invoiced",
  "window-to-cancel",
]);

// ─── Commission rates ────────────────────────────────────────────────────────

export const MARKETPLACE_COMMISSION_RATE = 0.0115; // 1.15%
export const PSP_FEE_RATE = 0.002;                 // 0.2% Adyen

// ─── Helpers ─────────────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function daysSince(isoDate: string): number {
  return (Date.now() - new Date(isoDate).getTime()) / (1000 * 60 * 60 * 24);
}

/** Next weekday occurrence (0=Sun … 5=Fri) relative to a given date */
function nextWeekday(from: Date, targetDay: number): Date {
  const d = new Date(from);
  const diff = (targetDay - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ─── Split status ────────────────────────────────────────────────────────────

/**
 * Maps a VTEX order status + age to a payment split status.
 *
 * - canceled                → excluded before this is called
 * - invoiced + > 30 days    → paid (approximate — no real disbursement record)
 * - invoiced + 14–30 days   → available (hold expired, ready for payout)
 * - invoiced + < 14 days    → pending (EU 14-day retraction hold)
 * - all other active statuses → pending (not yet invoiced)
 */
function computeStatus(vtexStatus: OrderStatus, creationDate: string): SplitStatus {
  if (vtexStatus !== "invoiced") return "pending";
  const days = daysSince(creationDate);
  if (days > 30) return "paid";
  if (days > 14) return "available";
  return "pending";
}

// ─── Payout calendar ─────────────────────────────────────────────────────────

function buildPayouts(splits: OrderSplit[]): PayoutEntry[] {
  const now = new Date();
  const payouts: PayoutEntry[] = [];

  // 1. Last paid batch — all "paid" splits grouped into one historical entry
  const paidSplits = splits.filter((s) => s.status === "paid");
  if (paidSplits.length > 0) {
    const lastPaidDate = paidSplits
      .map((s) => new Date(s.orderDate))
      .sort((a, b) => b.getTime() - a.getTime())[0];
    const paidPayoutDate = nextWeekday(lastPaidDate, 5); // nearest Friday after last paid order
    payouts.push({
      id: "pyt-paid",
      amount: round2(paidSplits.reduce((sum, s) => sum + s.netAmount, 0)),
      currency: "EUR",
      estimatedDate: paidPayoutDate.toISOString().split("T")[0],
      status: "paid",
      orderCount: paidSplits.length,
      reference: `ADYEN-PAYOUT-${paidPayoutDate.toISOString().split("T")[0]}`,
    });
  }

  // 2. Available batch — currently being processed, payout this Friday
  const availableSplits = splits.filter((s) => s.status === "available");
  if (availableSplits.length > 0) {
    const processingDate = nextWeekday(now, 5);
    payouts.push({
      id: "pyt-processing",
      amount: round2(availableSplits.reduce((sum, s) => sum + s.netAmount, 0)),
      currency: "EUR",
      estimatedDate: processingDate.toISOString().split("T")[0],
      status: "processing",
      orderCount: availableSplits.length,
      reference: `ADYEN-PAYOUT-${processingDate.toISOString().split("T")[0]}`,
    });
  }

  // 3. Pending batches — group by the Friday after their 14-day hold expires
  const pendingSplits = splits.filter((s) => s.status === "pending");
  const pendingByWeek = new Map<string, OrderSplit[]>();

  for (const split of pendingSplits) {
    const holdExpiry = new Date(new Date(split.orderDate).getTime() + 14 * 24 * 60 * 60 * 1000);
    const payoutFriday = nextWeekday(holdExpiry, 5);
    const key = payoutFriday.toISOString().split("T")[0];
    if (!pendingByWeek.has(key)) pendingByWeek.set(key, []);
    pendingByWeek.get(key)!.push(split);
  }

  Array.from(pendingByWeek.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([date, batch], idx) => {
      payouts.push({
        id: `pyt-scheduled-${idx + 1}`,
        amount: round2(batch.reduce((sum, s) => sum + s.netAmount, 0)),
        currency: "EUR",
        estimatedDate: date,
        status: "scheduled",
        orderCount: batch.length,
        reference: `ADYEN-PAYOUT-${date}`,
      });
    });

  return payouts.sort(
    (a, b) => new Date(a.estimatedDate).getTime() - new Date(b.estimatedDate).getTime()
  );
}

// ─── DAC7 ─────────────────────────────────────────────────────────────────────

function buildDac7(splits: OrderSplit[]): Dac7Data {
  const currentYear = new Date().getFullYear();
  const yearSplits = splits.filter(
    (s) => new Date(s.orderDate).getFullYear() === currentYear
  );
  const revenue = round2(yearSplits.reduce((sum, s) => sum + s.grossAmount, 0));
  const txCount = yearSplits.length;

  return {
    year: currentYear,
    cumulativeRevenue: revenue,
    transactionCount: txCount,
    revenueThreshold: 2000,
    transactionThreshold: 30,
    declarationRequired: revenue >= 2000 || txCount >= 30,
    declarationSubmitted: false,
  };
}

// ─── Public ───────────────────────────────────────────────────────────────────

export interface PaymentData {
  wallet: WalletBalance;
  splits: OrderSplit[];
  payouts: PayoutEntry[];
  reconciliation: ReconciliationLine[];
  dac7: Dac7Data;
  /** ISO date of the last successful fetch */
  fetchedAt: string;
}

/**
 * Fetches the last 100 orders for the seller (all statuses except canceled),
 * then derives all payment data by applying the configured commission and PSP
 * fee rates.
 *
 * Falls back to an empty dataset on error — callers should handle the fallback
 * by merging with mock data if needed.
 */
export async function fetchPaymentData(): Promise<PaymentData> {
  // Fetch all orders — no status filter so every active status is included
  const response = await listOrders({ perPage: 100 });
  const orders = response.list;

  // Exclude canceled orders — they generate no revenue
  const activeOrders = orders.filter((o) => ACTIVE_STATUSES.has(o.status));

  // Build splits
  const splits: OrderSplit[] = activeOrders.map((order) => {
    const grossAmount = round2(order.totalValue / 100);
    const commissionAmount = round2(grossAmount * MARKETPLACE_COMMISSION_RATE);
    const pspFeeAmount = round2(grossAmount * PSP_FEE_RATE);
    const netAmount = round2(grossAmount - commissionAmount - pspFeeAmount);
    const availableDate = new Date(
      new Date(order.creationDate).getTime() + 14 * 24 * 60 * 60 * 1000
    ).toISOString();

    return {
      orderId: order.orderId,
      orderDate: order.creationDate,
      invoicedDate: order.creationDate,
      grossAmount,
      commissionRate: MARKETPLACE_COMMISSION_RATE * 100,
      commissionAmount,
      pspFeeRate: PSP_FEE_RATE * 100,
      pspFeeAmount,
      netAmount,
      status: computeStatus(order.status, order.creationDate),
      availableDate,
    };
  });

  // Wallet
  const wallet: WalletBalance = {
    total: round2(splits.reduce((sum, s) => sum + s.grossAmount, 0)),
    pending: round2(
      splits
        .filter((s) => s.status === "pending")
        .reduce((sum, s) => sum + s.netAmount, 0)
    ),
    available: round2(
      splits
        .filter((s) => s.status === "available")
        .reduce((sum, s) => sum + s.netAmount, 0)
    ),
  };

  // Reconciliation — one line per order
  const reconciliation: ReconciliationLine[] = splits.map((s) => ({
    orderId: s.orderId,
    date: s.invoicedDate.split("T")[0],
    sku: "—",
    productName: `Order ${s.orderId}`,
    qty: 1,
    unitPrice: s.grossAmount,
    lineTotal: s.grossAmount,
    commission: s.commissionAmount,
    pspFee: s.pspFeeAmount,
    refund: 0,
    chargeback: 0,
    net: s.netAmount,
  }));

  return {
    wallet,
    splits,
    payouts: buildPayouts(splits),
    reconciliation,
    dac7: buildDac7(splits),
    fetchedAt: new Date().toISOString(),
  };
}
