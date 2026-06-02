import { formatPrice, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AdyenSettlement } from "@/lib/mock/onboarding";
import { TrendingUp } from "lucide-react";

const STATUS_STYLES = {
  paid: "bg-green-100 text-green-700",
  upcoming: "bg-indigo-100 text-indigo-700",
  processing: "bg-amber-100 text-amber-700",
};

const STATUS_LABELS = {
  paid: "Paid",
  upcoming: "Upcoming",
  processing: "Processing",
};

interface PaymentScheduleProps {
  settlements: AdyenSettlement[];
}

export function PaymentSchedule({ settlements }: PaymentScheduleProps) {
  const nextPayout = settlements.find((s) => s.status === "upcoming");
  const totalPaid = settlements
    .filter((s) => s.status === "paid")
    .reduce((sum, s) => sum + s.netPayout, 0);

  return (
    <div className="bg-white rounded-lg border border-zinc-200 overflow-hidden">
      {/* Header with next payout highlight */}
      <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-zinc-400" />
          <h3 className="text-sm font-semibold text-zinc-700">Adyen Payment Schedule</h3>
        </div>

        {nextPayout && (
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-xs text-zinc-400">Next payout</p>
              <p className="text-base font-bold text-indigo-600 mt-0.5">
                {formatPrice(nextPayout.netPayout)}
              </p>
              <p className="text-xs text-zinc-500">
                {formatDate(nextPayout.payoutDate)}
              </p>
            </div>
            <div className="h-10 w-px bg-zinc-100" />
            <div className="text-right">
              <p className="text-xs text-zinc-400">Total paid (4 weeks)</p>
              <p className="text-base font-bold text-zinc-800 mt-0.5">
                {formatPrice(totalPaid)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Settlements table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-50 border-b border-zinc-100">
              <th className="text-left px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                Period
              </th>
              <th className="text-center px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                Orders
              </th>
              <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                Gross Sales
              </th>
              <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                Adyen Fees
              </th>
              <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                Net Payout
              </th>
              <th className="text-right px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {settlements.map((s) => (
              <tr
                key={s.id}
                className={cn(
                  "hover:bg-zinc-50 transition-colors",
                  s.status === "upcoming" && "bg-indigo-50/40"
                )}
              >
                <td className="px-6 py-3.5">
                  <p className="font-medium text-zinc-700">
                    {formatDate(s.periodStart)} – {formatDate(s.periodEnd)}
                  </p>
                  <p className="text-xs text-zinc-400 font-mono mt-0.5">{s.reference}</p>
                </td>
                <td className="px-4 py-3.5 text-center text-zinc-600">
                  {s.orders}
                </td>
                <td className="px-4 py-3.5 text-right text-zinc-700">
                  {formatPrice(s.grossSales)}
                </td>
                <td className="px-4 py-3.5 text-right text-zinc-500">
                  −{formatPrice(s.adyenFees)}
                </td>
                <td className="px-4 py-3.5 text-right font-semibold text-zinc-900">
                  {formatPrice(s.netPayout)}
                </td>
                <td className="px-6 py-3.5 text-right">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                      STATUS_STYLES[s.status]
                    )}
                  >
                    {STATUS_LABELS[s.status]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
