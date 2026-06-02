import {
  ShoppingCart,
  TrendingUp,
  Package,
  CreditCard,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { OrdersByStatus } from "@/components/dashboard/OrdersByStatus";
import { RecentOrders } from "@/components/dashboard/RecentOrders";
import { listOrders, listOrdersMarketplace } from "@/lib/vtex/orders";
import { listSellerProducts } from "@/lib/vtex/catalog";
import { MOCK_ADYEN_SETTLEMENTS } from "@/lib/mock/onboarding";
import { formatPrice, formatDate } from "@/lib/format";
import type { RevenueDataPoint } from "@/components/dashboard/RevenueChart";
import type { StatusDataPoint } from "@/components/dashboard/OrdersByStatus";

const STATUS_COLORS: Record<string, string> = {
  invoiced: "#22c55e",
  handling: "#8b5cf6",
  "ready-for-handling": "#6366f1",
  "payment-approved": "#3b82f6",
  "payment-pending": "#f59e0b",
  canceled: "#ef4444",
  "window-to-cancel": "#f97316",
  "waiting-for-sellers-confirmation": "#94a3b8",
};

const STATUS_LABELS: Record<string, string> = {
  invoiced: "Invoiced",
  handling: "Handling",
  "ready-for-handling": "Ready to Handle",
  "payment-approved": "Payment Approved",
  "payment-pending": "Payment Pending",
  canceled: "Cancelled",
  "window-to-cancel": "Cancel Window",
  "waiting-for-sellers-confirmation": "Awaiting Confirm.",
};

function groupRevenueByDay(
  orders: Array<{ creationDate: string; totalValue: number }>
): RevenueDataPoint[] {
  const map = new Map<string, number>();
  for (const o of orders) {
    const d = new Date(o.creationDate);
    const key = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
    map.set(key, (map.get(key) ?? 0) + o.totalValue);
  }
  return [...map.entries()].map(([date, revenue]) => ({ date, revenue }));
}

function groupByStatus(
  orders: Array<{ status: string }>
): StatusDataPoint[] {
  const map = new Map<string, number>();
  for (const o of orders) {
    map.set(o.status, (map.get(o.status) ?? 0) + 1);
  }
  return [...map.entries()]
    .sort(([, a], [, b]) => b - a)
    .map(([status, count]) => ({
      label: STATUS_LABELS[status] ?? status,
      count,
      color: STATUS_COLORS[status] ?? "#94a3b8",
    }));
}

export default async function DashboardPage() {
  const [ordersRes, products] = await Promise.all([
    // Use marketplace-wide orders for dashboard KPIs (seller may have 0 orders yet)
    listOrdersMarketplace({ perPage: 50, orderBy: "creationDate,desc" }).catch(() => ({
      list: [],
      paging: { total: 0, pages: 0, currentPage: 1, perPage: 50 },
      stats: { stats: {} },
    })),
    listSellerProducts({ from: 0, to: 49 }).catch(() => []),
  ]);

  const orders = ordersRes.list;
  const totalOrders = ordersRes.paging.total;
  const totalRevenueCents = orders.reduce((s, o) => s + o.totalValue, 0);
  const avgOrderValueCents = orders.length > 0
    ? Math.round(totalRevenueCents / orders.length)
    : 0;

  const revenueByDay = groupRevenueByDay(orders);
  const statusBreakdown = groupByStatus(orders);
  const recentOrders = orders.slice(0, 6);
  const nextPayout = MOCK_ADYEN_SETTLEMENTS.find((s) => s.status === "upcoming");

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Overview of your seller performance on franceretail"
      />

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="Total Revenue"
          value={formatPrice(totalRevenueCents)}
          sub={`from ${orders.length} orders shown`}
          icon={<TrendingUp className="w-5 h-5" />}
          accent="indigo"
        />
        <KpiCard
          label="Total Orders"
          value={totalOrders.toLocaleString("en")}
          sub="all time (all statuses)"
          icon={<ShoppingCart className="w-5 h-5" />}
          accent="green"
        />
        <KpiCard
          label="Avg Order Value"
          value={formatPrice(avgOrderValueCents)}
          sub="across latest 50 orders"
          icon={<CreditCard className="w-5 h-5" />}
          accent="amber"
        />
        <KpiCard
          label="Active Products"
          value={String(products.length)}
          sub="in seller catalog"
          icon={<Package className="w-5 h-5" />}
          accent="zinc"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="col-span-2 bg-white rounded-lg border border-zinc-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-zinc-700">Revenue Over Time</h3>
            <span className="text-xs text-zinc-400">Latest 50 orders</span>
          </div>
          <div className="h-52">
            <RevenueChart data={revenueByDay} />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-zinc-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-zinc-700">Orders by Status</h3>
            <span className="text-xs text-zinc-400">{orders.length} orders</span>
          </div>
          <div className="h-52">
            <OrdersByStatus data={statusBreakdown} />
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <RecentOrders orders={recentOrders} />
        </div>

        {/* Next Adyen payout */}
        <div className="bg-white rounded-lg border border-zinc-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-100">
            <h3 className="text-sm font-semibold text-zinc-700">Next Adyen Payout</h3>
          </div>
          <div className="px-5 py-5 space-y-4">
            {nextPayout ? (
              <>
                <div>
                  <p className="text-xs text-zinc-400">Expected on</p>
                  <p className="text-sm font-semibold text-zinc-800 mt-0.5">
                    {formatDate(nextPayout.payoutDate)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400">Net payout</p>
                  <p className="text-3xl font-bold text-indigo-600 mt-0.5">
                    {formatPrice(nextPayout.netPayout)}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-100">
                  <div>
                    <p className="text-xs text-zinc-400">Gross sales</p>
                    <p className="text-sm font-medium text-zinc-700 mt-0.5">
                      {formatPrice(nextPayout.grossSales)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-400">Adyen fees</p>
                    <p className="text-sm font-medium text-red-500 mt-0.5">
                      −{formatPrice(nextPayout.adyenFees)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <span className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                    Upcoming
                  </span>
                  <span className="text-xs text-zinc-400">
                    {nextPayout.orders} orders in period
                  </span>
                </div>
              </>
            ) : (
              <p className="text-sm text-zinc-400">No upcoming payout</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
