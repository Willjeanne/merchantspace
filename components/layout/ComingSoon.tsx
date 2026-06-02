import type { ReactNode } from "react";

interface ComingSoonProps {
  icon: ReactNode;
  module: string;
  description: string;
}

export function ComingSoon({ icon, module, description }: ComingSoonProps) {
  return (
    <div className="flex flex-col items-center justify-center h-64 rounded-lg border-2 border-dashed border-zinc-200 bg-white gap-3">
      {icon}
      <div className="text-center">
        <p className="text-sm font-medium text-zinc-500">Coming in {module}</p>
        <p className="text-xs text-zinc-400 mt-1 max-w-xs">{description}</p>
      </div>
    </div>
  );
}
