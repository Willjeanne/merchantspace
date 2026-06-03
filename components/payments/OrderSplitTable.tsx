"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OrderSplit, SplitStatus } from "@/lib/types/payments";

interface OrderSplitTableProps {
  orders: OrderSplit[];
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR" }).format(n);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
}

const STATUS_CONFIG: Record<SplitStatus, { label: string; className: string }> = {
  pending:   { label: "Pending",   className: "bg-amber-50 text-amber-700 border-amber-200" },
  available: { label: "Available", className: "bg-green-50 text-green-700 border-green-200" },
  paid:      { label: "Paid",      className: "bg-zinc-100 text-zinc-600 border-zinc-200" },
};

function StatusBadge({ status }: { status: SplitStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border", cfg.className)}>
      {cfg.label}
    </span>
  );
}

function exportCSV(orders: OrderSplit[]) {
  const headers = ["Order", "Date", "Gross (€)", "Commission (%)", "Commission (€)", "PSP fees (€)", "Net (€)", "Status"];
  const rows = orders.map((o) => [
    o.orderId,
    fmtDate(o.invoicedDate),
    o.grossAmount.toFixed(2),
    o.commissionRate.toFixed(1),
    o.commissionAmount.toFixed(2),
    o.pspFeeAmount.toFixed(2),
    o.netAmount.toFixed(2),
    STATUS_CONFIG[o.status].label,
  ]);
  const csv = [headers, ...rows].map((r) => r.join(";")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "orders-split.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function OrderSplitTable({ orders }: OrderSplitTableProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<SplitStatus | "all">("all");

  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-2">
          {(["all", "pending", "available", "paid"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                filter === s
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50"
              )}
            >
              {s === "all" ? "All" : STATUS_CONFIG[s].label}
            </button>
          ))}
        </div>
        <button
          onClick={() => exportCSV(orders)}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-200 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50">
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Order</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Invoice date</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500">Gross</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500">Commission</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500">PSP fees</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 font-semibold">Net</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-zinc-500">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {filtered.map((order) => (
              <>
                <tr
                  key={order.orderId}
                  className="hover:bg-zinc-50 cursor-pointer transition-colors"
                  onClick={() => setExpanded(expanded === order.orderId ? null : order.orderId)}
                >
                  <td className="px-4 py-3 font-mono text-xs text-zinc-700">{order.orderId}</td>
                  <td className="px-4 py-3 text-zinc-600">{fmtDate(order.invoicedDate)}</td>
                  <td className="px-4 py-3 text-right text-zinc-700">{fmt(order.grossAmount)}</td>
                  <td className="px-4 py-3 text-right text-red-600">
                    -{fmt(order.commissionAmount)}
                    <span className="text-zinc-400 text-xs ml-1">({order.commissionRate}%)</span>
                  </td>
                  <td className="px-4 py-3 text-right text-red-400 text-xs">-{fmt(order.pspFeeAmount)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-green-700">{fmt(order.netAmount)}</td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    {expanded === order.orderId ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </td>
                </tr>
                {expanded === order.orderId && (
                  <tr key={`${order.orderId}-detail`} className="bg-indigo-50">
                    <td colSpan={8} className="px-6 py-4">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                        <div>
                          <p className="text-zinc-500 mb-1">Order date</p>
                          <p className="font-medium text-zinc-800">{fmtDate(order.orderDate)}</p>
                        </div>
                        <div>
                          <p className="text-zinc-500 mb-1">Available from</p>
                          <p className="font-medium text-zinc-800">{fmtDate(order.availableDate)}</p>
                        </div>
                        <div>
                          <p className="text-zinc-500 mb-1">Commission rate</p>
                          <p className="font-medium text-zinc-800">{order.commissionRate}% product</p>
                        </div>
                        <div>
                          <p className="text-zinc-500 mb-1">PSP rate</p>
                          <p className="font-medium text-zinc-800">{order.pspFeeRate}% (Adyen mock)</p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-2 text-xs">
                        <span className="text-zinc-500">Breakdown:</span>
                        <span className="font-mono bg-white rounded px-2 py-0.5 border border-zinc-200">
                          {fmt(order.grossAmount)} − {fmt(order.commissionAmount)} − {fmt(order.pspFeeAmount)} ={" "}
                          <span className="text-green-700 font-semibold">{fmt(order.netAmount)}</span>
                        </span>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-sm text-zinc-400">No orders for this filter.</div>
        )}
      </div>
    </div>
  );
}
