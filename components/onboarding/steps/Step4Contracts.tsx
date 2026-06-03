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
            <span className="text-xs font-medium text-green-700">Signed</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 shrink-0">
            <Clock className="w-4 h-4 text-zinc-400" />
            <span className="text-xs text-zinc-500">Pending</span>
          </div>
        )}
      </div>

      {signed && contract.signedAt && (
        <div className="text-xs text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2 mb-4">
          Signed by <span className="font-medium">{contract.signerName}</span> on{" "}
          {new Date(contract.signedAt).toLocaleDateString("en-US", {
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
            Between <strong>franceretail SAS</strong> (hereinafter "the Marketplace") and{" "}
            <strong>{signerName || "[Company name]"}</strong> (hereinafter "the Seller"), the following is agreed:
          </p>
          <p>
            <strong>Article 1 — Purpose.</strong> This agreement defines the conditions under which the Seller lists
            its products for sale via the franceretail Marketplace.
          </p>
          <p>
            <strong>Article 2 — Commission.</strong> A commission of 12% (inclusive of all taxes) will be deducted from
            each transaction completed via the Marketplace.
          </p>
          <p>
            <strong>Article 3 — Payments.</strong> Payments are made on a weekly basis, following the expiry of the
            statutory 14-day withdrawal period (EU 2011/83).
          </p>
          <p>
            <strong>Article 4 — Duration.</strong> This agreement is concluded for an indefinite period and may be
            terminated by either party with 30 days' notice.
          </p>
          <p className="text-zinc-400 italic">
            [Generated for demonstration purposes — not legally binding]
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
          {previewing ? "Hide" : "Preview"}
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-200 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Download PDF
        </button>
        {!signed && (
          <button
            type="button"
            onClick={() => onSign(contract.id)}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 transition-colors ml-auto"
          >
            <PenLine className="w-3.5 h-3.5" />
            Sign electronically
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
              signerName: signerName || "Legal representative",
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
          <p className="text-sm font-medium text-zinc-700">Contracts to sign</p>
          <p className="text-xs text-zinc-500 mt-0.5">Electronic signature with legal value (mock eIDAS)</p>
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
            <p className="text-sm font-semibold text-green-800">All contracts have been signed</p>
            <p className="text-xs text-green-700 mt-0.5">
              You can proceed to the final activation step.
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
