"use client";

import { Banknote, Clock, CheckCircle2, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WalletBalance } from "@/lib/types/payments";

interface WalletCardsProps {
  balance: WalletBalance;
}

function fmt(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function WalletCards({ balance }: WalletCardsProps) {
  const cards = [
    {
      label: "Total brut",
      value: balance.total,
      icon: Banknote,
      color: "text-zinc-700",
      bg: "bg-zinc-50",
      border: "border-zinc-200",
      description: "Cumul de toutes les commandes facturées",
    },
    {
      label: "En attente",
      value: balance.pending,
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-amber-50",
      border: "border-amber-200",
      description: "Hold rétractation 14 j ou livraison non confirmée",
    },
    {
      label: "Disponible",
      value: balance.available,
      icon: CheckCircle2,
      color: "text-green-600",
      bg: "bg-green-50",
      border: "border-green-200",
      description: "Prêt à être versé",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {cards.map(({ label, value, icon: Icon, color, bg, border, description }) => (
        <div
          key={label}
          className={cn("rounded-xl border p-5 flex flex-col gap-3", bg, border)}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-600">{label}</span>
            <div className={cn("p-2 rounded-lg", bg)}>
              <Icon className={cn("w-4 h-4", color)} />
            </div>
          </div>
          <div>
            <p className={cn("text-2xl font-bold", color)}>{fmt(value)}</p>
            <p className="text-xs text-zinc-400 mt-1">{description}</p>
          </div>
        </div>
      ))}

      {/* Progress bar: pending/total */}
      <div className="sm:col-span-3 bg-white border border-zinc-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-600" />
            <span className="text-sm font-medium text-zinc-700">Répartition du solde</span>
          </div>
          <span className="text-xs text-zinc-500">Total : {fmt(balance.total)}</span>
        </div>
        <div className="h-3 bg-zinc-100 rounded-full overflow-hidden flex">
          <div
            className="h-full bg-green-500 transition-all"
            style={{ width: `${(balance.available / balance.total) * 100}%` }}
          />
          <div
            className="h-full bg-amber-400 transition-all"
            style={{ width: `${(balance.pending / balance.total) * 100}%` }}
          />
        </div>
        <div className="flex gap-4 mt-2 text-xs text-zinc-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
            Disponible ({Math.round((balance.available / balance.total) * 100)}%)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
            En attente ({Math.round((balance.pending / balance.total) * 100)}%)
          </span>
        </div>
      </div>
    </div>
  );
}
