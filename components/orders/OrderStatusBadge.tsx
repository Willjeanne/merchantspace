import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/lib/types/orders";

interface StatusConfig {
  label: string;
  className: string;
}

const STATUS_MAP: Record<string, StatusConfig> = {
  "waiting-for-sellers-confirmation": {
    label: "Awaiting Confirmation",
    className: "bg-zinc-100 text-zinc-600",
  },
  "payment-pending": {
    label: "Payment Pending",
    className: "bg-amber-100 text-amber-700",
  },
  "payment-approved": {
    label: "Payment Approved",
    className: "bg-blue-100 text-blue-700",
  },
  "ready-for-handling": {
    label: "Ready to Handle",
    className: "bg-indigo-100 text-indigo-700",
  },
  handling: {
    label: "Handling",
    className: "bg-purple-100 text-purple-700",
  },
  invoiced: {
    label: "Invoiced",
    className: "bg-green-100 text-green-700",
  },
  canceled: {
    label: "Cancelled",
    className: "bg-red-100 text-red-600",
  },
  "window-to-cancel": {
    label: "Cancellation Window",
    className: "bg-orange-100 text-orange-600",
  },
};

interface OrderStatusBadgeProps {
  status: OrderStatus | string;
  className?: string;
}

export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  const config = STATUS_MAP[status] ?? {
    label: status,
    className: "bg-zinc-100 text-zinc-600",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
