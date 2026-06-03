"use client";

import { useActionState } from "react";
import { CheckCircle2, Loader2, AlertCircle, ExternalLink, Rocket } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LegalInfo } from "@/lib/types/onboarding";
import { createSellerAction } from "@/lib/actions/sellers";
import { buildSellerSummary } from "@/lib/utils/sellers";

interface Step5ActivationProps {
  legalInfo: Partial<LegalInfo>;
  sellerCreated: boolean;
  sellerId?: string;
  onActivated: (sellerId: string) => void;
}

const RECAP_ROWS = [
  { label: "Company name", key: "companyName" as keyof LegalInfo },
  { label: "SIREN", key: "siren" as keyof LegalInfo },
  { label: "VAT number", key: "vatNumber" as keyof LegalInfo },
  { label: "Address", key: "registeredAddress" as keyof LegalInfo },
  { label: "City", key: "city" as keyof LegalInfo },
  { label: "Country", key: "country" as keyof LegalInfo },
  { label: "Representative", key: "repFirstName" as keyof LegalInfo },
  { label: "Rep. email", key: "repEmail" as keyof LegalInfo },
];

function deriveSellerIdFromName(name: string | undefined): string {
  if (!name) return "seller-" + Date.now();
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30) + "-" + Math.floor(Math.random() * 1000);
}

export function Step5Activation({ legalInfo, sellerCreated, sellerId, onActivated }: Step5ActivationProps) {
  const [state, formAction, pending] = useActionState(
    async (prev: { error?: string; success?: boolean; sellerId?: string }, formData: FormData) => {
      const result = await createSellerAction(prev, formData);
      if (result.success && result.sellerId) {
        onActivated(result.sellerId);
      }
      return result;
    },
    {}
  );

  const derivedSellerId = deriveSellerIdFromName(legalInfo.tradeName ?? legalInfo.companyName);
  const summary = buildSellerSummary(legalInfo);

  if (sellerCreated && sellerId) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center text-center gap-4 py-8">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-zinc-900">Seller account activated!</h3>
            <p className="text-sm text-zinc-600 mt-1">
              Your store is now active on the <strong>franceretail</strong> marketplace.
            </p>
          </div>
          <div className="bg-zinc-50 border border-zinc-200 rounded-xl px-6 py-3 text-center">
            <p className="text-xs text-zinc-500">Seller ID</p>
            <p className="font-mono font-semibold text-zinc-800 mt-0.5">{sellerId}</p>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-2">
          <p className="text-sm font-semibold text-green-800">Next steps</p>
          <ul className="space-y-1.5 text-xs text-green-700">
            <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Add your first products in the Catalog tab</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Configure your warehouse in Fulfillment</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Track your payments in the Payments tab</li>
          </ul>
        </div>

        <a
          href={`https://franceretail.myvtex.com/admin/seller-register/sellers/${sellerId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-xs text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          View in VTEX Admin
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Recap */}
      <div>
        <h3 className="text-sm font-semibold text-zinc-800 mb-3">Summary</h3>
        <div className="bg-white border border-zinc-200 rounded-xl divide-y divide-zinc-50">
          {RECAP_ROWS.map(({ label, key }) => {
            const val =
              key === "repFirstName"
                ? [legalInfo.repFirstName, legalInfo.repLastName].filter(Boolean).join(" ")
                : (legalInfo[key] as string | undefined);
            return (
              <div key={key} className="flex items-center justify-between px-4 py-3 gap-4">
                <span className="text-xs text-zinc-500 shrink-0">{label}</span>
                <span className="text-xs font-medium text-zinc-800 text-right">
                  {val || <span className="text-zinc-300 italic">Not provided</span>}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Error */}
      {state.error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-sm text-red-700">{state.error}</p>
        </div>
      )}

      {/* Activation form */}
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="sellerId" value={derivedSellerId} />
        <input type="hidden" name="sellerAccount" value="franceretailer1388" />
        <input type="hidden" name="sellerName" value={legalInfo.companyName ?? ""} />
        <input type="hidden" name="sellerEmail" value={legalInfo.repEmail ?? ""} />
        <input type="hidden" name="taxCode" value={legalInfo.vatNumber ?? ""} />

        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Rocket className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-indigo-800">All set!</p>
              <p className="text-xs text-indigo-700 mt-1">
                Click "Activate seller account" to create your account via the VTEX API
                ({summary || "franceretailer1388"}).
              </p>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={pending}
          className={cn(
            "w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all",
            pending
              ? "bg-zinc-200 text-zinc-500 cursor-not-allowed"
              : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
          )}
        >
          {pending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Activating…
            </>
          ) : (
            <>
              <Rocket className="w-4 h-4" />
              Activate seller account
            </>
          )}
        </button>
      </form>
    </div>
  );
}
