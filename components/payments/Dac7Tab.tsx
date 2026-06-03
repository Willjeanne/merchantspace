"use client";

import { Download, AlertTriangle, CheckCircle2, FileText, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Dac7Data } from "@/lib/types/payments";

interface Dac7TabProps {
  data: Dac7Data;
}

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="h-3 bg-zinc-100 rounded-full overflow-hidden">
      <div
        className={cn("h-full rounded-full transition-all", color)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function Dac7Tab({ data }: Dac7TabProps) {
  const revenuePct = Math.min((data.cumulativeRevenue / data.revenueThreshold) * 100, 100);
  const txPct = Math.min((data.transactionCount / data.transactionThreshold) * 100, 100);
  const revenueExceeded = data.cumulativeRevenue >= data.revenueThreshold;
  const txExceeded = data.transactionCount >= data.transactionThreshold;

  return (
    <div className="space-y-6">
      {/* Status banner */}
      {data.declarationRequired ? (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">
              Déclaration DAC7 requise pour {data.year}
            </p>
            <p className="text-xs text-amber-700 mt-1">
              Vous avez dépassé le seuil de déclaration UE (Directive 2021/514).
              Votre marketplace doit transmettre vos données à l'administration fiscale avant le 31 janvier {data.year + 1}.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
          <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-green-800">
              Seuil non atteint — aucune déclaration requise pour l'instant
            </p>
            <p className="text-xs text-green-700 mt-1">
              Déclaration obligatoire si ≥ {fmt(data.revenueThreshold)} de recettes OU ≥ {data.transactionThreshold} transactions dans l'année.
            </p>
          </div>
        </div>
      )}

      {/* Thresholds */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Revenue */}
        <div className="bg-white border border-zinc-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-700">Recettes cumulées {data.year}</span>
            <span className={cn(
              "text-xs font-medium px-2 py-0.5 rounded-full border",
              revenueExceeded ? "bg-red-50 text-red-700 border-red-200" : "bg-zinc-50 text-zinc-600 border-zinc-200"
            )}>
              {revenueExceeded ? "Seuil dépassé" : "Sous le seuil"}
            </span>
          </div>
          <div>
            <div className="flex items-end justify-between mb-2">
              <span className="text-2xl font-bold text-zinc-800">{fmt(data.cumulativeRevenue)}</span>
              <span className="text-xs text-zinc-500">Seuil : {fmt(data.revenueThreshold)}</span>
            </div>
            <ProgressBar
              value={data.cumulativeRevenue}
              max={data.revenueThreshold}
              color={revenueExceeded ? "bg-red-500" : "bg-indigo-500"}
            />
            <p className="text-xs text-zinc-500 mt-1">
              {revenuePct.toFixed(0)}% du seuil de déclaration
            </p>
          </div>
        </div>

        {/* Transactions */}
        <div className="bg-white border border-zinc-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-700">Transactions {data.year}</span>
            <span className={cn(
              "text-xs font-medium px-2 py-0.5 rounded-full border",
              txExceeded ? "bg-red-50 text-red-700 border-red-200" : "bg-zinc-50 text-zinc-600 border-zinc-200"
            )}>
              {txExceeded ? "Seuil dépassé" : "Sous le seuil"}
            </span>
          </div>
          <div>
            <div className="flex items-end justify-between mb-2">
              <span className="text-2xl font-bold text-zinc-800">{data.transactionCount}</span>
              <span className="text-xs text-zinc-500">Seuil : {data.transactionThreshold} transactions</span>
            </div>
            <ProgressBar
              value={data.transactionCount}
              max={data.transactionThreshold}
              color={txExceeded ? "bg-red-500" : "bg-indigo-500"}
            />
            <p className="text-xs text-zinc-500 mt-1">
              {txPct.toFixed(0)}% du seuil de déclaration
            </p>
          </div>
        </div>
      </div>

      {/* Declaration status */}
      <div className="bg-white border border-zinc-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-zinc-800">Statut de déclaration</h3>
          <button
            onClick={() => {
              // Mock export — in production, would generate a real report
              alert("Export DAC7 : fonctionnalité disponible en production via l'API VTEX Marketplace");
            }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-200 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Exporter rapport
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-zinc-50 rounded-lg">
            <FileText className="w-6 h-6 text-zinc-400 mx-auto mb-2" />
            <p className="text-xs text-zinc-500">Déclaration {data.year}</p>
            <p className={cn(
              "text-sm font-semibold mt-1",
              data.declarationSubmitted ? "text-green-700" : "text-amber-600"
            )}>
              {data.declarationSubmitted ? "Soumise ✓" : "En attente"}
            </p>
          </div>
          <div className="text-center p-4 bg-zinc-50 rounded-lg">
            <p className="text-xs text-zinc-500 mb-1">Délai légal</p>
            <p className="text-sm font-semibold text-zinc-700">31 jan. {data.year + 1}</p>
            <p className="text-xs text-zinc-400 mt-1">Directive 2021/514 UE</p>
          </div>
          <div className="text-center p-4 bg-zinc-50 rounded-lg">
            <p className="text-xs text-zinc-500 mb-1">Champ d'application</p>
            <p className="text-sm font-semibold text-zinc-700">Marketplace</p>
            <p className="text-xs text-zinc-400 mt-1">Transmission par franceretail</p>
          </div>
        </div>
      </div>

      {/* Info note */}
      <div className="flex items-start gap-2 text-xs text-zinc-500 bg-zinc-50 rounded-xl p-4 border border-zinc-100">
        <Info className="w-4 h-4 shrink-0 mt-0.5 text-zinc-400" />
        <p>
          La directive DAC7 (2021/514/UE) oblige les opérateurs de plateformes numériques à déclarer les revenus des
          vendeurs dépassant 2 000 € ou 30 transactions par an aux autorités fiscales. Ces données sont transmises
          automatiquement par la marketplace (franceretail) — aucune action directe du vendeur n'est requise,
          mais vous devez vous assurer que vos informations fiscales (SIREN, numéro TVA) sont à jour.
        </p>
      </div>
    </div>
  );
}
