"use client";

import { useState, useMemo } from "react";
import { Download, Search, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReconciliationLine } from "@/lib/types/payments";

interface ReconciliationTableProps {
  lines: ReconciliationLine[];
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR" }).format(n);
}

function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
}

function exportCSV(lines: ReconciliationLine[]) {
  const headers = [
    "Order", "Date", "SKU", "Product", "Qty",
    "Unit price (€)", "Line total (€)", "Commission (€)", "PSP fees (€)",
    "Refund (€)", "Chargeback (€)", "Net (€)",
  ];
  const rows = lines.map((l) => [
    l.orderId, l.date, l.sku, `"${l.productName}"`, l.qty,
    l.unitPrice.toFixed(2), l.lineTotal.toFixed(2), l.commission.toFixed(2),
    l.pspFee.toFixed(2), l.refund.toFixed(2), l.chargeback.toFixed(2), l.net.toFixed(2),
  ]);
  const csv = [headers, ...rows].map((r) => r.join(";")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "reconciliation.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function ReconciliationTable({ lines }: ReconciliationTableProps) {
  const [search, setSearch] = useState("");
  const [showAnomaliesOnly, setShowAnomaliesOnly] = useState(false);

  const filtered = useMemo(() => {
    let result = lines;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.orderId.toLowerCase().includes(q) ||
          l.sku.toLowerCase().includes(q) ||
          l.productName.toLowerCase().includes(q)
      );
    }
    if (showAnomaliesOnly) {
      result = result.filter((l) => l.refund > 0 || l.chargeback > 0);
    }
    return result;
  }, [lines, search, showAnomaliesOnly]);

  const totals = useMemo(
    () =>
      filtered.reduce(
        (acc, l) => ({
          lineTotal: acc.lineTotal + l.lineTotal,
          commission: acc.commission + l.commission,
          pspFee: acc.pspFee + l.pspFee,
          refund: acc.refund + l.refund,
          chargeback: acc.chargeback + l.chargeback,
          net: acc.net + l.net,
        }),
        { lineTotal: 0, commission: 0, pspFee: 0, refund: 0, chargeback: 0, net: 0 }
      ),
    [filtered]
  );

  const anomalyCount = lines.filter((l) => l.refund > 0 || l.chargeback > 0).length;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
            <input
              type="text"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs border border-zinc-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 w-52"
            />
          </div>

          {anomalyCount > 0 && (
            <button
              onClick={() => setShowAnomaliesOnly(!showAnomaliesOnly)}
              className={cn(
                "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                showAnomaliesOnly
                  ? "bg-amber-500 text-white border-amber-500"
                  : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
              )}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Anomalies ({anomalyCount})
            </button>
          )}
        </div>

        <button
          onClick={() => exportCSV(filtered)}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-200 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-x-auto">
        <table className="w-full text-xs min-w-[900px]">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50">
              <th className="text-left px-4 py-3 font-medium text-zinc-500">Order</th>
              <th className="text-left px-4 py-3 font-medium text-zinc-500">Date</th>
              <th className="text-left px-4 py-3 font-medium text-zinc-500">SKU</th>
              <th className="text-left px-4 py-3 font-medium text-zinc-500">Product</th>
              <th className="text-right px-4 py-3 font-medium text-zinc-500">Qty</th>
              <th className="text-right px-4 py-3 font-medium text-zinc-500">Line total</th>
              <th className="text-right px-4 py-3 font-medium text-zinc-500">Commission</th>
              <th className="text-right px-4 py-3 font-medium text-zinc-500">PSP</th>
              <th className="text-right px-4 py-3 font-medium text-amber-600">Refund</th>
              <th className="text-right px-4 py-3 font-medium text-red-500">Chargeback</th>
              <th className="text-right px-4 py-3 font-semibold text-green-700">Net</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {filtered.map((line) => {
              const hasAnomaly = line.refund > 0 || line.chargeback > 0;
              return (
                <tr
                  key={`${line.orderId}-${line.sku}`}
                  className={cn("transition-colors", hasAnomaly ? "bg-amber-50/50" : "hover:bg-zinc-50")}
                >
                  <td className="px-4 py-3 font-mono text-zinc-700">{line.orderId}</td>
                  <td className="px-4 py-3 text-zinc-500">{fmtDate(line.date)}</td>
                  <td className="px-4 py-3 font-mono text-zinc-500">{line.sku}</td>
                  <td className="px-4 py-3 text-zinc-700 max-w-[160px] truncate">{line.productName}</td>
                  <td className="px-4 py-3 text-right text-zinc-600">{line.qty}</td>
                  <td className="px-4 py-3 text-right text-zinc-700">{fmt(line.lineTotal)}</td>
                  <td className="px-4 py-3 text-right text-red-600">-{fmt(line.commission)}</td>
                  <td className="px-4 py-3 text-right text-red-400">-{fmt(line.pspFee)}</td>
                  <td className="px-4 py-3 text-right text-amber-600">
                    {line.refund > 0 ? `-${fmt(line.refund)}` : <span className="text-zinc-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-red-600">
                    {line.chargeback > 0 ? `-${fmt(line.chargeback)}` : <span className="text-zinc-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-green-700">{fmt(line.net)}</td>
                </tr>
              );
            })}
          </tbody>
          {filtered.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-zinc-200 bg-zinc-50 font-semibold">
                <td colSpan={5} className="px-4 py-3 text-zinc-600 text-xs">
                  Total ({filtered.length} line{filtered.length > 1 ? "s" : ""})
                </td>
                <td className="px-4 py-3 text-right text-zinc-700">{fmt(totals.lineTotal)}</td>
                <td className="px-4 py-3 text-right text-red-600">-{fmt(totals.commission)}</td>
                <td className="px-4 py-3 text-right text-red-400">-{fmt(totals.pspFee)}</td>
                <td className="px-4 py-3 text-right text-amber-600">
                  {totals.refund > 0 ? `-${fmt(totals.refund)}` : <span className="text-zinc-300">—</span>}
                </td>
                <td className="px-4 py-3 text-right text-red-600">
                  {totals.chargeback > 0 ? `-${fmt(totals.chargeback)}` : <span className="text-zinc-300">—</span>}
                </td>
                <td className="px-4 py-3 text-right font-bold text-green-700">{fmt(totals.net)}</td>
              </tr>
            </tfoot>
          )}
        </table>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-sm text-zinc-400">No lines for this search.</div>
        )}
      </div>
    </div>
  );
}
