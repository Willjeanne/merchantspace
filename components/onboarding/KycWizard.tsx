"use client";

import { useState } from "react";
import { CheckCircle2, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  OnboardingState,
  WizardStep,
  KycDocument,
  KycCheck,
  Contract,
  LegalInfo,
} from "@/lib/types/onboarding";
import { Step1Legal } from "./steps/Step1Legal";
import { Step2Documents } from "./steps/Step2Documents";
import { Step3Kyc } from "./steps/Step3Kyc";
import { Step4Contracts } from "./steps/Step4Contracts";
import { Step5Activation } from "./steps/Step5Activation";

// ─── Initial data ─────────────────────────────────────────────────────────────

const INITIAL_DOCUMENTS: KycDocument[] = [
  {
    id: "kbis",
    label: "Kbis extract (< 3 months)",
    description: "Proof of legal existence of the company",
    required: true,
    status: "required",
  },
  {
    id: "id-rep",
    label: "Legal representative's identity document",
    description: "Valid national ID or passport",
    required: true,
    status: "required",
  },
  {
    id: "iban",
    label: "Bank details / IBAN",
    description: "Bank account details for payouts",
    required: true,
    status: "required",
  },
  {
    id: "attestation-urssaf",
    label: "URSSAF certificate",
    description: "Vigilance certificate (< 6 months)",
    required: false,
    status: "required",
  },
  {
    id: "assurance",
    label: "Professional liability insurance certificate",
    description: "Professional civil liability",
    required: false,
    status: "required",
  },
];

const INITIAL_KYC_CHECKS: KycCheck[] = [
  {
    id: "siren-check",
    label: "SIREN / SIRET verification",
    description: "Validation of company existence with INSEE",
    status: "not_started",
  },
  {
    id: "sanctions-check",
    label: "Sanctions & blacklist screening",
    description: "Verification against EU, UN and OFAC lists",
    status: "not_started",
  },
  {
    id: "identity-check",
    label: "Representative identity verification",
    description: "Document validation + liveness check",
    status: "not_started",
  },
  {
    id: "aml-check",
    label: "AML check (Anti-Money Laundering)",
    description: "Money laundering risk analysis",
    status: "not_started",
  },
];

const INITIAL_CONTRACTS: Contract[] = [
  {
    id: "marketplace-agreement",
    title: "Marketplace Seller Agreement",
    description: "General terms of sale on the franceretail platform — commissions, SLA, responsibilities",
    status: "pending",
  },
  {
    id: "data-processing",
    title: "Data Processing Agreement (DPA)",
    description: "Processing of buyer personal data — GDPR Article 28",
    status: "pending",
  },
];

// ─── Steps config ─────────────────────────────────────────────────────────────

const STEPS: { step: WizardStep; label: string; description: string }[] = [
  { step: 1, label: "Legal information", description: "Entity & representative" },
  { step: 2, label: "KYC documents", description: "Supporting documents" },
  { step: 3, label: "Verifications", description: "Automated KYC/KYB" },
  { step: 4, label: "Contracts", description: "E-signature" },
  { step: 5, label: "Activation", description: "Account creation" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function KycWizard() {
  const [state, setState] = useState<OnboardingState>({
    currentStep: 1,
    completedSteps: new Set<WizardStep>(),
    kycStatus: "not_started",
    legalInfo: {},
    documents: INITIAL_DOCUMENTS,
    kycChecks: INITIAL_KYC_CHECKS,
    contracts: INITIAL_CONTRACTS,
    sellerCreated: false,
  });

  function goTo(step: WizardStep) {
    setState((prev) => ({ ...prev, currentStep: step }));
  }

  function completeStep(step: WizardStep) {
    setState((prev) => ({
      ...prev,
      completedSteps: new Set([...prev.completedSteps, step]),
      currentStep: (step < 5 ? step + 1 : 5) as WizardStep,
    }));
  }

  function canAdvance(): boolean {
    const s = state.currentStep;
    if (s === 1) return !!state.legalInfo.companyName && !!state.legalInfo.repEmail;
    if (s === 2) return state.documents.filter((d) => d.required).every((d) => d.status !== "required");
    if (s === 3) return state.kycChecks.every((c) => c.status === "verified");
    if (s === 4) return state.contracts.every((c) => c.status === "signed");
    return true;
  }

  const repName = [state.legalInfo.repFirstName, state.legalInfo.repLastName].filter(Boolean).join(" ");

  return (
    <div className="max-w-3xl mx-auto">
      {/* Stepper */}
      <div className="mb-8">
        <div className="flex items-center gap-0">
          {STEPS.map(({ step, label, description }, idx) => {
            const isCompleted = state.completedSteps.has(step);
            const isActive = state.currentStep === step;
            const isReachable = step === 1 || state.completedSteps.has((step - 1) as WizardStep);

            return (
              <div key={step} className="flex items-center flex-1">
                <button
                  onClick={() => isReachable || isCompleted ? goTo(step) : undefined}
                  disabled={!isReachable && !isCompleted && !isActive}
                  className={cn(
                    "flex flex-col items-center gap-1 flex-1 p-2 rounded-lg transition-all",
                    isActive ? "opacity-100" : isCompleted ? "opacity-100 cursor-pointer" : isReachable ? "opacity-70 cursor-pointer hover:opacity-90" : "opacity-30 cursor-default"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                    isCompleted ? "bg-green-500 text-white" :
                    isActive ? "bg-indigo-600 text-white" :
                    "bg-zinc-200 text-zinc-500"
                  )}>
                    {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : step}
                  </div>
                  <span className={cn(
                    "text-xs font-medium hidden sm:block text-center leading-tight",
                    isActive ? "text-indigo-700" : isCompleted ? "text-green-700" : "text-zinc-500"
                  )}>
                    {label}
                  </span>
                </button>
                {idx < STEPS.length - 1 && (
                  <ChevronRight className="w-4 h-4 text-zinc-300 shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step content */}
      <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="border-b border-zinc-100 px-6 py-4">
          <h2 className="text-base font-semibold text-zinc-800">
            {STEPS[state.currentStep - 1].label}
          </h2>
          <p className="text-sm text-zinc-500 mt-0.5">
            {STEPS[state.currentStep - 1].description}
          </p>
        </div>

        <div className="p-6">
          {state.currentStep === 1 && (
            <Step1Legal
              data={state.legalInfo}
              onChange={(legalInfo) => setState((prev) => ({ ...prev, legalInfo }))}
            />
          )}
          {state.currentStep === 2 && (
            <Step2Documents
              documents={state.documents}
              onChange={(documents) => setState((prev) => ({ ...prev, documents }))}
            />
          )}
          {state.currentStep === 3 && (
            <Step3Kyc
              checks={state.kycChecks}
              onChecksUpdate={(kycChecks) => setState((prev) => ({ ...prev, kycChecks }))}
            />
          )}
          {state.currentStep === 4 && (
            <Step4Contracts
              contracts={state.contracts}
              signerName={repName}
              onContractsUpdate={(contracts) => setState((prev) => ({ ...prev, contracts }))}
            />
          )}
          {state.currentStep === 5 && (
            <Step5Activation
              legalInfo={state.legalInfo}
              sellerCreated={state.sellerCreated}
              sellerId={state.sellerId}
              onActivated={(sellerId) =>
                setState((prev) => ({
                  ...prev,
                  sellerCreated: true,
                  sellerId,
                  completedSteps: new Set([...prev.completedSteps, 5 as WizardStep]),
                }))
              }
            />
          )}
        </div>

        {/* Footer nav */}
        {state.currentStep < 5 && (
          <div className="border-t border-zinc-100 px-6 py-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => state.currentStep > 1 && goTo((state.currentStep - 1) as WizardStep)}
              disabled={state.currentStep === 1}
              className="px-4 py-2 text-sm font-medium text-zinc-600 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => completeStep(state.currentStep)}
              disabled={!canAdvance()}
              className="px-6 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {state.currentStep === 4 ? "Proceed to activation" : "Continue"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
