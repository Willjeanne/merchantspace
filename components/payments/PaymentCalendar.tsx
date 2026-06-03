"use client";

import { CheckCircle2, Clock, Loader2, Calendar, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PayoutEntry, PayoutStatus } from "@/lib/types/payments";

interface PaymentCalendarProps {
  payouts: PayoutEntry[];
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR" }).format(n);
}

function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const STATUS_CONFIG: Record<PayoutStatus, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  lineColor: string;
  dotColor: string;
  badgeClass: string;
}> = {
  paid: {
    label: "Paid",
    icon: CheckCircle2,
    lineColor: "bg-green-200",
    dotColor: "bg-green-500 ring-green-100",
    badgeClass: "bg-green-50 text-green-700 border-green-200",
  },
  processing: {
    label: "Processing",
    icon: Loader2,
    lineColor: "bg-indigo-200",
    dotColor: "bg-indigo-500 ring-indigo-100",
    badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
  scheduled: {
    label: "Scheduled",
    icon: Calendar,
    lineColor: "bg-zinc-200",
    dotColor: "bg-zinc-400 ring-zinc-100",
    badgeClass: "bg-zinc-50 text-zinc-600 border-zinc-200",
  },
  failed: {
    label: "Failed",
    icon: AlertCircle,
    lineColor: "bg-red-200",
    dotColor: "bg-red-500 ring-red-100",
    badgeClass: "bg-red-50 text-red-700 border-red-200",
  },
};

export function PaymentCalendar({ payouts }: PaymentCalendarProps) {
  const sorted = [...payouts].sort(
    (a, b) => new Date(a.estimatedDate).getTime() - new Date(b.estimatedDate).getTime()
  );

  const totalScheduled = sorted
    .filter((p) => p.status === "scheduled" || p.status === "processing")
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-indigo-600 font-medium">Upcoming total</p>
          <p className="text-2xl font-bold text-indigo-700 mt-0.5">{fmt(totalScheduled)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-indigo-500">{sorted.filter(p => p.status === "scheduled").length} scheduled payouts</p>
          <p className="text-xs text-indigo-500 mt-1">Frequency: weekly</p>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {sorted.map((payout, idx) => {
          const cfg = STATUS_CONFIG[payout.status];
          const Icon = cfg.icon;
          const isLast = idx === sorted.length - 1;

          return (
            <div key={payout.id} className="flex gap-4">
              {/* Left: dot + line */}
              <div className="flex flex-col items-center">
                <div className={cn("w-4 h-4 rounded-full ring-4 shrink-0 mt-1", cfg.dotColor)} />
                {!isLast && <div className={cn("w-0.5 flex-1 mt-1 mb-0", cfg.lineColor)} style={{ minHeight: "40px" }} />}
              </div>

              {/* Right: content */}
              <div className={cn("flex-1 pb-6", isLast && "pb-0")}>
                <div className="bg-white border border-zinc-200 rounded-xl p-4 hover:border-zinc-300 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className={cn("w-4 h-4", payout.status === "processing" && "animate-spin",
                          payout.status === "paid" ? "text-green-600" :
                          payout.status === "processing" ? "text-indigo-600" :
                          payout.status === "failed" ? "text-red-600" : "text-zinc-500"
                        )} />
                        <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full border", cfg.badgeClass)}>
                          {cfg.label}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-zinc-800 mt-1">{fmt(payout.amount)}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">{payout.orderCount} order{payout.orderCount > 1 ? "s" : ""}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-medium text-zinc-700">{fmtDate(payout.estimatedDate)}</p>
                      <p className="text-xs text-zinc-400 mt-1 font-mono">{payout.reference}</p>
                    </div>
                  </div>

                  {payout.status === "scheduled" && (
                    <div className="mt-3 pt-3 border-t border-zinc-100">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3 text-zinc-400" />
                        <span className="text-xs text-zinc-500">
                          Payout scheduled after retraction period expires (14-day EU)
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
