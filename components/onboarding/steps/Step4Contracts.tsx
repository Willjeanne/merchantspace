"use client";

import { useState } from "react";
import { FileText, CheckCircle2, Clock, PenLine, Download, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Contract } from "@/lib/types/onboarding";

interface Step4ContractsProps {
  contracts: Contract[];
  signerName: string;
  onContractsUpdate: (contracts: Contract[]) => void;
}

function ContractCard({
  contract,
  signerName,
  onSign,
}: {
  contract: Contract;
  signerName: string;
  onSign: (id: string) => void;
}) {
  const [previewing, setPreviewing] = useState(false);
  const signed = contract.status === "signed";

  return (
    <div
      className={cn(
        "bg-white border rounded-xl p-5 transition-all",
        signed ? "border-green-200 bg-green-50/20" : "border-zinc-200"
      )}
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-start gap-3">
          <div className={cn(
            "p-2 rounded-lg shrink-0",
            signed ? "bg-green-100" : "bg-zinc-100"
          )}>
            <FileText className={cn("w-5 h-5", signed ? "text-green-600" : "text-zinc-500")} />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-800">{contract.title}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{contract.description}</p>
          </div>
        </div>

        {signed ? (
          <div className="flex items-center gap-1.5 shrink-0">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <span className="text-xs font-medium text-green-700">Signé</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 shrink-0">
            <Clock className="w-4 h-4 text-zinc-400" />
            <span className="text-xs text-zinc-500">En attente</span>
          </div>
        )}
      </div>

      {signed && contract.signedAt && (
        <div className="text-xs text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2 mb-4">
          Signé par <span className="font-medium">{contract.signerName}</span> le{" "}
          {new Date(contract.signedAt).toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      )}

      {/* Mock contract preview */}
      {previewing && (
        <div className="mb-4 bg-zinc-50 border border-zinc-200 rounded-lg p-4 text-xs text-zinc-600 space-y-2 max-h-48 overflow-y-auto">
          <p className="font-semibold text-zinc-800 text-center mb-3">{contract.title}</p>
          <p>
            Entre <strong>franceretail SAS</strong> (ci-après «&nbsp;la Marketplace&nbsp;») et{" "}
            <strong>{signerName || "[Raison sociale]"}</strong> (ci-après «&nbsp;le Vendeur&nbsp;»), il est convenu ce qui suit :
          </p>
          <p>
            <strong>Article 1 — Objet.</strong> Le présent accord a pour objet de définir les conditions dans lesquelles
            le Vendeur met en vente ses produits via la Marketplace franceretail.
          </p>
          <p>
            <strong>Article 2 — Commission.</strong> Une commission de 12 % (Toutes Taxes Comprises) sera prélevée sur
            chaque transaction réalisée via la Marketplace.
          </p>
          <p>
            <strong>Article 3 — Paiements.</strong> Les paiements sont effectués de manière hebdomadaire, après
            expiration du délai de rétractation légal de 14 jours (UE 2011/83).
          </p>
          <p>
            <strong>Article 4 — Durée.</strong> Le présent accord est conclu pour une durée indéterminée, résiliable
            par l'une ou l'autre des parties moyennant un préavis de 30 jours.
          </p>
          <p className="text-zinc-400 italic">
            [Document généré à titre de démonstration — non contractuellement opposable]
          </p>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setPreviewing(!previewing)}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-200 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
        >
          <Eye className="w-3.5 h-3.5" />
          {previewing ? "Masquer" : "Prévisualiser"}
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-200 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Télécharger PDF
        </button>
        {!signed && (
          <button
            type="button"
            onClick={() => onSign(contract.id)}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 transition-colors ml-auto"
          >
            <PenLine className="w-3.5 h-3.5" />
            Signer électroniquement
          </button>
        )}
      </div>
    </div>
  );
}

export function Step4Contracts({ contracts, signerName, onContractsUpdate }: Step4ContractsProps) {
  function handleSign(id: string) {
    onContractsUpdate(
      contracts.map((c) =>
        c.id === id
          ? {
              ...c,
              status: "signed" as const,
              signedAt: new Date().toISOString(),
              signerName: signerName || "Représentant légal",
            }
          : c
      )
    );
  }

  const signedCount = contracts.filter((c) => c.status === "signed").length;
  const allSigned = signedCount === contracts.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-700">Contrats à signer</p>
          <p className="text-xs text-zinc-500 mt-0.5">Signature électronique avec valeur légale (mock eIDAS)</p>
        </div>
        <span className={cn(
          "text-sm font-semibold",
          allSigned ? "text-green-700" : "text-zinc-600"
        )}>
          {signedCount}/{contracts.length}
        </span>
      </div>

      {allSigned && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
          <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-800">Tous les contrats ont été signés</p>
            <p className="text-xs text-green-700 mt-0.5">
              Vous pouvez procéder à l'étape finale d'activation.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {contracts.map((contract) => (
          <ContractCard
            key={contract.id}
            contract={contract}
            signerName={signerName}
            onSign={handleSign}
          />
        ))}
      </div>
    </div>
  );
}
