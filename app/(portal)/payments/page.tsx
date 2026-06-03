import { PageHeader } from "@/components/layout/PageHeader";
import { WalletCards } from "@/components/payments/WalletCards";
import { OrderSplitTable } from "@/components/payments/OrderSplitTable";
import { PaymentCalendar } from "@/components/payments/PaymentCalendar";
import { ReconciliationTable } from "@/components/payments/ReconciliationTable";
import { Dac7Tab } from "@/components/payments/Dac7Tab";
import {
  MOCK_WALLET,
  MOCK_ORDER_SPLITS,
  MOCK_PAYOUTS,
  MOCK_RECONCILIATION,
  MOCK_DAC7,
} from "@/lib/mock/payments";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function PaymentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        description="Track payouts, commissions and tax compliance"
      />

      <Tabs defaultValue="overview">
        <TabsList className="bg-zinc-100 border border-zinc-200">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="reconciliation">Reconciliation</TabsTrigger>
          <TabsTrigger value="dac7">DAC7</TabsTrigger>
        </TabsList>

        {/* Overview / Wallet */}
        <TabsContent value="overview" className="mt-6">
          <WalletCards balance={MOCK_WALLET} />
        </TabsContent>

        {/* Order split table */}
        <TabsContent value="orders" className="mt-6">
          <OrderSplitTable orders={MOCK_ORDER_SPLITS} />
        </TabsContent>

        {/* Payment calendar */}
        <TabsContent value="calendar" className="mt-6">
          <PaymentCalendar payouts={MOCK_PAYOUTS} />
        </TabsContent>

        {/* Reconciliation */}
        <TabsContent value="reconciliation" className="mt-6">
          <ReconciliationTable lines={MOCK_RECONCILIATION} />
        </TabsContent>

        {/* DAC7 */}
        <TabsContent value="dac7" className="mt-6">
          <Dac7Tab data={MOCK_DAC7} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
