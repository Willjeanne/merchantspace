import { PageHeader } from "@/components/layout/PageHeader";
import { WalletCards } from "@/components/payments/WalletCards";
import { OrderSplitTable } from "@/components/payments/OrderSplitTable";
import { PaymentCalendar } from "@/components/payments/PaymentCalendar";
import { ReconciliationTable } from "@/components/payments/ReconciliationTable";
import { Dac7Tab } from "@/components/payments/Dac7Tab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchPaymentData, MARKETPLACE_COMMISSION_RATE, PSP_FEE_RATE } from "@/lib/vtex/payments";
import {
  MOCK_WALLET,
  MOCK_ORDER_SPLITS,
  MOCK_PAYOUTS,
  MOCK_RECONCILIATION,
  MOCK_DAC7,
} from "@/lib/mock/payments";
import { AlertCircle } from "lucide-react";

export default async function PaymentsPage() {
  let data = null;
  let error: string | null = null;

  try {
    data = await fetchPaymentData();
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load payment data";
  }

  const wallet        = data?.wallet        ?? MOCK_WALLET;
  const splits        = data?.splits.length  ? data.splits        : MOCK_ORDER_SPLITS;
  const payouts       = data?.payouts.length ? data.payouts       : MOCK_PAYOUTS;
  const reconciliation = data?.reconciliation.length ? data.reconciliation : MOCK_RECONCILIATION;
  const dac7          = data?.dac7           ?? MOCK_DAC7;
  const isLive        = !!data && !error;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        description="Track payouts, commissions and tax compliance"
      />

      {/* Source indicator */}
      <div className="flex items-center gap-2 text-xs">
        {isLive ? (
          <>
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
            <span className="text-zinc-500">
              Live data · {splits.length} active orders ·{" "}
              <span className="font-medium text-zinc-700">
                {(MARKETPLACE_COMMISSION_RATE * 100).toFixed(2)}% marketplace commission
              </span>{" "}
              +{" "}
              <span className="font-medium text-zinc-700">
                {(PSP_FEE_RATE * 100).toFixed(2)}% Adyen
              </span>
            </span>
          </>
        ) : (
          <>
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
            <span className="text-zinc-400">Demo data</span>
          </>
        )}
      </div>

      {/* API error banner */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>
            Could not load live orders ({error}). Showing demo data.
          </span>
        </div>
      )}

      <Tabs defaultValue="overview">
        <TabsList className="bg-zinc-100 border border-zinc-200">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="reconciliation">Reconciliation</TabsTrigger>
          <TabsTrigger value="dac7">DAC7</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <WalletCards balance={wallet} />
        </TabsContent>

        <TabsContent value="orders" className="mt-6">
          <OrderSplitTable orders={splits} />
        </TabsContent>

        <TabsContent value="calendar" className="mt-6">
          <PaymentCalendar payouts={payouts} />
        </TabsContent>

        <TabsContent value="reconciliation" className="mt-6">
          <ReconciliationTable lines={reconciliation} />
        </TabsContent>

        <TabsContent value="dac7" className="mt-6">
          <Dac7Tab data={dac7} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
