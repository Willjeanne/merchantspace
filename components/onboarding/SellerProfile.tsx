import { CheckCircle2 } from "lucide-react";

interface SellerProfileProps {
  account: string;
  affiliateId: string;
  sellerId: string;
  completedSteps: number;
  totalSteps: number;
}

export function SellerProfile({
  account,
  affiliateId,
  sellerId,
  completedSteps,
  totalSteps,
}: SellerProfileProps) {
  const pct = Math.round((completedSteps / totalSteps) * 100);

  return (
    <div className="bg-white rounded-lg border border-zinc-200 p-6 flex items-center gap-6">
      {/* Avatar */}
      <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 shrink-0">
        <span className="text-white text-xl font-bold">
          {account.slice(0, 2).toUpperCase()}
        </span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-zinc-900">{account}</h2>
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
            <CheckCircle2 className="w-3 h-3" />
            Active
          </span>
        </div>
        <div className="flex items-center gap-4 mt-1 text-sm text-zinc-500">
          <span>Seller ID: <span className="font-mono text-zinc-700">{sellerId}</span></span>
          <span>·</span>
          <span>Affiliate: <span className="font-mono text-zinc-700">{affiliateId}</span></span>
          <span>·</span>
          <span>External Seller</span>
        </div>
      </div>

      {/* Onboarding progress */}
      <div className="shrink-0 text-right">
        <p className="text-sm font-medium text-zinc-700">
          Setup progress
        </p>
        <p className="text-2xl font-bold text-zinc-900 mt-0.5">{pct}%</p>
        <div className="w-32 h-1.5 bg-zinc-100 rounded-full mt-2 ml-auto">
          <div
            className="h-full bg-indigo-600 rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-zinc-400 mt-1">
          {completedSteps}/{totalSteps} steps completed
        </p>
      </div>
    </div>
  );
}
