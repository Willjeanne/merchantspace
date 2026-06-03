/**
 * Mock data for the Onboarding module.
 * Simulates Adyen settlement reports and seller profile.
 * Replace with real Adyen Reporting API when credentials are available.
 */

export interface AdyenSettlement {
  id: string;
  periodStart: string;
  periodEnd: string;
  payoutDate: string;
  orders: number;
  grossSales: number;   // in cents
  adyenFees: number;    // in cents
  netPayout: number;    // in cents
  status: "paid" | "upcoming" | "processing";
  reference: string;
  merchantReference: string;
}

export const MOCK_ADYEN_SETTLEMENTS: AdyenSettlement[] = [
  {
    id: "ADY-2026-W22",
    periodStart: "2026-05-26",
    periodEnd: "2026-06-01",
    payoutDate: "2026-06-04",
    orders: 7,
    grossSales: 198600,
    adyenFees: 5958,
    netPayout: 192642,
    status: "upcoming",
    reference: "SETTLEMENT_2026_W22",
    merchantReference: "FRN-W22-2026",
  },
  {
    id: "ADY-2026-W21",
    periodStart: "2026-05-19",
    periodEnd: "2026-05-25",
    payoutDate: "2026-05-28",
    orders: 14,
    grossSales: 387450,
    adyenFees: 11624,
    netPayout: 375826,
    status: "paid",
    reference: "SETTLEMENT_2026_W21",
    merchantReference: "FRN-W21-2026",
  },
  {
    id: "ADY-2026-W20",
    periodStart: "2026-05-12",
    periodEnd: "2026-05-18",
    payoutDate: "2026-05-21",
    orders: 9,
    grossSales: 241300,
    adyenFees: 7239,
    netPayout: 234061,
    status: "paid",
    reference: "SETTLEMENT_2026_W20",
    merchantReference: "FRN-W20-2026",
  },
  {
    id: "ADY-2026-W19",
    periodStart: "2026-05-05",
    periodEnd: "2026-05-11",
    payoutDate: "2026-05-14",
    orders: 11,
    grossSales: 312800,
    adyenFees: 9384,
    netPayout: 303416,
    status: "paid",
    reference: "SETTLEMENT_2026_W19",
    merchantReference: "FRN-W19-2026",
  },
  {
    id: "ADY-2026-W18",
    periodStart: "2026-04-28",
    periodEnd: "2026-05-04",
    payoutDate: "2026-05-07",
    orders: 6,
    grossSales: 156900,
    adyenFees: 4707,
    netPayout: 152193,
    status: "paid",
    reference: "SETTLEMENT_2026_W18",
    merchantReference: "FRN-W18-2026",
  },
];

export interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  actionLabel?: string;
  actionHref?: string;
}

export const ONBOARDING_CHECKLIST: ChecklistItem[] = [
  {
    id: "store",
    label: "Store configured",
    description: "Seller account set up on VTEX marketplace",
    completed: true,
  },
  {
    id: "fulfillment",
    label: "Fulfillment endpoint configured",
    description: "Fulfillment endpoint configured and connected to your VTEX seller account",
    completed: true,
  },
  {
    id: "adyen",
    label: "Adyen payment provider connected",
    description: "Processing payments via Adyen — merchant account FRN_ECOMM",
    completed: true,
  },
  {
    id: "catalog",
    label: "First product added to catalog",
    description: "At least one active SKU available on the marketplace",
    completed: true,
  },
  {
    id: "order",
    label: "First order received",
    description: "End-to-end order flow validated",
    completed: true,
  },
  {
    id: "bank",
    label: "Bank account verified",
    description: "Required for Adyen payouts — submit your IBAN to receive settlements",
    completed: false,
    actionLabel: "Submit IBAN",
    actionHref: "#bank",
  },
  {
    id: "tax",
    label: "Tax documentation submitted",
    description: "VAT registration and tax compliance documents — due June 30, 2026",
    completed: false,
    actionLabel: "Upload documents",
    actionHref: "#tax",
  },
];

export interface Integration {
  id: string;
  name: string;
  description: string;
  status: "connected" | "pending" | "error";
  detail: string;
  logoInitials: string;
  logoColor: string;
}

export const INTEGRATIONS: Integration[] = [
  {
    id: "vtex",
    name: "VTEX Seller Portal",
    description: "Marketplace connection",
    status: "connected",
    detail: "Synced · Affiliate ID: FRN",
    logoInitials: "VX",
    logoColor: "bg-pink-600",
  },
  {
    id: "adyen",
    name: "Adyen",
    description: "Payment processing",
    status: "connected",
    detail: "Merchant account: FRN_ECOMM · EU region",
    logoInitials: "AD",
    logoColor: "bg-green-600",
  },
  {
    id: "fulfillment",
    name: "Fulfillment Endpoint",
    description: "Order routing & logistics",
    status: "connected",
    detail: "vtexcommerce.com.br · SC: 1",
    logoInitials: "FF",
    logoColor: "bg-blue-600",
  },
  {
    id: "bank",
    name: "Bank Account",
    description: "Payout destination",
    status: "pending",
    detail: "IBAN verification required",
    logoInitials: "BA",
    logoColor: "bg-zinc-400",
  },
];
