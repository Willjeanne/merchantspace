"use client";

import { useState } from "react";
import { Loader2, CheckCircle2, XCircle, AlertCircle, Clock, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { KycCheck, KycStatus } from "@/lib/types/onboarding";

interface Step3KycProps {
  checks: KycCheck[];
  onChecksUpdate: (checks: KycCheck[]) => void;
}

const STATUS_CONFIG: Record<KycStatus, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeClass: string;
  spin?: boolean;
}> = {
  not_started: { label: "Not started", icon: Clock, badgeClass: "bg-zinc-100 text-zinc-500 border-zinc-200" },
  pending: { label: "In progress…", icon: Loader2, badgeClass: "bg-indigo-50 text-indigo-600 border-indigo-200", spin: true },
  in_review: { label: "In review", icon: AlertCircle, badgeClass: "bg-amber-50 text-amber-700 border-amber-200" },
  verified: { label: "Verified", icon: CheckCircle2, badgeClass: "bg-green-50 text-green-700 border-green-200" },
  requires_action: { label: "Action required", icon: XCircle, badgeClass: "bg-red-50 text-red-700 border-red-200" },
};

const CHECK_SEQUENCE: KycStatus[] = ["not_started", "pending", "in_review", "verified"];

function KycCheckCard({ check, onRetry }: { check: KycCheck; onRetry: (id: string) => void }) {
  const cfg = STATUS_CONFIG[check.status];
  const Icon = cfg.icon;
  return (
    <div
      className={cn(
        "bg-white border rounded-xl p-4 flex items-start justify-between gap-4",
        check.status === "verified" ? "border-green-200" :
        check.status === "requires_action" ? "border-red-200" :
        check.status === "pending" ? "border-indigo-200" :
        "border-zinc-200"
      )}
    >
      <div className="flex-1">
        <p className="text-sm font-medium text-zinc-800">{check.label}</p>
        <p className="text-xs text-zinc-500 mt-0.5">{check.description}</p>
        {check.status === "requires_action" && check.failureReason && (
          <p className="text-xs text-red-600 mt-2 bg-red-50 px-2 py-1 rounded">
            {check.failureReason}
          </p>
        )}
        {check.status === "verified" && check.completedAt && (
          <p className="text-xs text-green-600 mt-1">
            Verified on {new Date(check.completedAt).toLocaleDateString("en-US")}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full border", cfg.badgeClass)}>
          <Icon className={cn("w-3.5 h-3.5", cfg.spin && "animate-spin")} />
          {cfg.label}
        </span>
        {check.status === "requires_action" && (
          <button
            onClick={() => onRetry(check.id)}
            className="p-1.5 rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-50 transition-colors"
            title="Re-run verification"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

export function Step3Kyc({ checks, onChecksUpdate }: Step3KycProps) {
  const [running, setRunning] = useState(false);

  const allVerified = checks.every((c) => c.status === "verified");
  const anyFailed = checks.some((c) => c.status === "requires_action");
  const anyPending = checks.some((c) => c.status === "pending" || c.status === "in_review");

  function runChecks() {
    setRunning(true);

    // Stagger checks: each advances one step at a time
    checks.forEach((check, idx) => {
      setTimeout(() => {
        onChecksUpdate(
          checks.map((c) =>
            c.id === check.id ? { ...c, status: "pending" } : c
          )
        );
      }, idx * 600);

      setTimeout(() => {
        onChecksUpdate(
          checks.map((c) =>
            c.id === check.id ? { ...c, status: "in_review" } : c
          )
        );
      }, idx * 600 + 1200);

      setTimeout(() => {
        onChecksUpdate(
          checks.map((c) =>
            c.id === check.id
              ? { ...c, status: "verified", completedAt: new Date().toISOString() }
              : c
          )
        );
        if (idx === checks.length - 1) setRunning(false);
      }, idx * 600 + 2400);
    });
  }

  function retryCheck(id: string) {
    onChecksUpdate(
      checks.map((c) =>
        c.id === id ? { ...c, status: "pending", failureReason: undefined } : c
      )
    );
    setTimeout(() => {
      onChecksUpdate(
        checks.map((c) =>
          c.id === id ? { ...c, status: "verified", completedAt: new Date().toISOString() } : c
        )
      );
    }, 2000);
  }

  return (
    <div className="space-y-6">
      {/* Summary banner */}
      {allVerified ? (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
          <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-800">KYC/KYB completed successfully</p>
            <p className="text-xs text-green-700 mt-0.5">All checks have been validated. You can proceed to the next step.</p>
          </div>
        </div>
      ) : anyFailed ? (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
          <XCircle className="w-5 h-5 text-red-500 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-800">Action required</p>
            <p className="text-xs text-red-700 mt-0.5">Some checks require your attention. Re-run them after correction.</p>
          </div>
        </div>
      ) : anyPending ? (
        <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-100 rounded-xl p-4">
          <Loader2 className="w-5 h-5 text-indigo-500 animate-spin shrink-0" />
          <div>
            <p className="text-sm font-semibold text-indigo-800">Verifications in progress…</p>
            <p className="text-xs text-indigo-700 mt-0.5">Our systems are analysing your information. This may take a few minutes.</p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 bg-zinc-50 border border-zinc-200 rounded-xl p-4">
          <Clock className="w-5 h-5 text-zinc-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-zinc-700">KYC/KYB checks pending</p>
            <p className="text-xs text-zinc-500 mt-0.5">Run the checks — they complete in seconds (demo mode).</p>
          </div>
        </div>
      )}

      {/* Checks list */}
      <div className="space-y-3">
        {checks.map((check) => (
          <KycCheckCard key={check.id} check={check} onRetry={retryCheck} />
        ))}
      </div>

      {/* Launch button */}
      {!allVerified && !anyPending && (
        <button
          onClick={runChecks}
          disabled={running}
          className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-60"
        >
          {running ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Checking…
            </>
          ) : (
            "Run KYC/KYB checks"
          )}
        </button>
      )}
    </div>
  );
}
