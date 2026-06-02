import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  trend?: { value: string; direction: "up" | "down" | "neutral" };
  icon: React.ReactNode;
  accent?: "indigo" | "green" | "amber" | "zinc";
}

const ACCENT_STYLES = {
  indigo: "bg-indigo-50 text-indigo-600",
  green: "bg-green-50 text-green-600",
  amber: "bg-amber-50 text-amber-600",
  zinc: "bg-zinc-100 text-zinc-500",
};

export function KpiCard({
  label,
  value,
  sub,
  trend,
  icon,
  accent = "indigo",
}: KpiCardProps) {
  return (
    <div className="bg-white rounded-lg border border-zinc-200 p-5 flex items-start gap-4">
      {/* Icon */}
      <div
        className={cn(
          "flex items-center justify-center w-10 h-10 rounded-xl shrink-0",
          ACCENT_STYLES[accent]
        )}
      >
        {icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide">
          {label}
        </p>
        <p className="text-2xl font-bold text-zinc-900 mt-1 leading-tight">{value}</p>
        {sub && (
          <p className="text-xs text-zinc-400 mt-0.5">{sub}</p>
        )}
        {trend && (
          <div className="flex items-center gap-1 mt-1.5">
            {trend.direction === "up" ? (
              <TrendingUp className="w-3 h-3 text-green-500" />
            ) : trend.direction === "down" ? (
              <TrendingDown className="w-3 h-3 text-red-500" />
            ) : (
              <Minus className="w-3 h-3 text-zinc-400" />
            )}
            <span
              className={cn(
                "text-xs font-medium",
                trend.direction === "up"
                  ? "text-green-600"
                  : trend.direction === "down"
                  ? "text-red-600"
                  : "text-zinc-500"
              )}
            >
              {trend.value}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
