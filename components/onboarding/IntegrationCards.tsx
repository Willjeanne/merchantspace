import { CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Integration } from "@/lib/mock/onboarding";

interface IntegrationCardProps {
  integration: Integration;
}

function IntegrationCard({ integration }: IntegrationCardProps) {
  const { name, description, status, detail, logoInitials, logoColor } = integration;

  const statusConfig = {
    connected: {
      icon: <CheckCircle2 className="w-4 h-4 text-green-500" />,
      label: "Connected",
      labelClass: "text-green-600",
    },
    pending: {
      icon: <Clock className="w-4 h-4 text-amber-500" />,
      label: "Pending",
      labelClass: "text-amber-600",
    },
    error: {
      icon: <AlertCircle className="w-4 h-4 text-red-500" />,
      label: "Error",
      labelClass: "text-red-600",
    },
  }[status];

  return (
    <div
      className={cn(
        "bg-white rounded-lg border p-5 flex items-start gap-4",
        status === "pending" ? "border-amber-200 bg-amber-50/30" : "border-zinc-200"
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex items-center justify-center w-10 h-10 rounded-lg shrink-0",
          logoColor
        )}
      >
        <span className="text-white text-xs font-bold">{logoInitials}</span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-zinc-800">{name}</p>
          <div className="flex items-center gap-1 shrink-0">
            {statusConfig.icon}
            <span className={cn("text-xs font-medium", statusConfig.labelClass)}>
              {statusConfig.label}
            </span>
          </div>
        </div>
        <p className="text-xs text-zinc-400 mt-0.5">{description}</p>
        <p className="text-xs text-zinc-500 mt-1.5 font-mono truncate">{detail}</p>
      </div>
    </div>
  );
}

interface IntegrationCardsProps {
  integrations: Integration[];
}

export function IntegrationCards({ integrations }: IntegrationCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {integrations.map((integration) => (
        <IntegrationCard key={integration.id} integration={integration} />
      ))}
    </div>
  );
}
