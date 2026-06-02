import { CheckCircle2, Circle, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChecklistItem } from "@/lib/mock/onboarding";

interface SetupChecklistProps {
  items: ChecklistItem[];
}

export function SetupChecklist({ items }: SetupChecklistProps) {
  const done = items.filter((i) => i.completed).length;

  return (
    <div className="bg-white rounded-lg border border-zinc-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-700">Setup Checklist</h3>
        <span className="text-xs text-zinc-400">
          {done} of {items.length} complete
        </span>
      </div>

      <ul className="divide-y divide-zinc-50">
        {items.map((item) => (
          <li
            key={item.id}
            className={cn(
              "flex items-start gap-4 px-6 py-4",
              !item.completed && "bg-amber-50/30"
            )}
          >
            {/* Icon */}
            <div className="mt-0.5 shrink-0">
              {item.completed ? (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              ) : (
                <Circle className="w-5 h-5 text-zinc-300" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  "text-sm font-medium",
                  item.completed ? "text-zinc-700" : "text-zinc-800"
                )}
              >
                {item.label}
              </p>
              <p className="text-xs text-zinc-400 mt-0.5 truncate">{item.description}</p>
            </div>

            {/* Action */}
            {!item.completed && item.actionLabel && (
              <a
                href={item.actionHref ?? "#"}
                className="shrink-0 inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                {item.actionLabel}
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
