import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { formatPrice, formatDate } from "@/lib/format";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import type { VtexOrderSummary } from "@/lib/types/orders";

interface RecentOrdersProps {
  orders: VtexOrderSummary[];
}

export function RecentOrders({ orders }: RecentOrdersProps) {
  return (
    <div className="bg-white rounded-lg border border-zinc-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-700">Recent Orders</h3>
        <Link
          href="/orders"
          className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          View all
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {orders.length === 0 ? (
        <div className="px-6 py-8 text-center text-sm text-zinc-400">
          No orders yet
        </div>
      ) : (
        <div className="divide-y divide-zinc-50">
          {orders.map((order) => (
            <Link
              key={order.orderId}
              href={`/orders/${order.orderId}`}
              className="flex items-center gap-4 px-6 py-3.5 hover:bg-zinc-50 transition-colors"
            >
              {/* Order ID + date */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-800 font-mono truncate">
                  {order.orderId}
                </p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {order.clientName} · {formatDate(order.creationDate)}
                </p>
              </div>

              {/* Status */}
              <OrderStatusBadge status={order.status} />

              {/* Amount */}
              <p className="text-sm font-semibold text-zinc-900 shrink-0">
                {formatPrice(order.totalValue)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
