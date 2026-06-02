import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { OrderFilters } from "@/components/orders/OrderFilters";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { listOrders } from "@/lib/vtex/orders";
import { formatPrice, formatDate } from "@/lib/format";
import { ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import type { OrderStatus } from "@/lib/types/orders";

const PER_PAGE = 20;

interface OrdersPageProps {
  searchParams: Promise<{
    q?: string;
    status?: string;
    page?: string;
  }>;
}

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const params = await searchParams;
  const q = params.q ?? "";
  const status = (params.status as OrderStatus | undefined) ?? undefined;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));

  let data;
  let error: string | null = null;

  try {
    data = await listOrders({ q, status, page, perPage: PER_PAGE });
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load orders";
  }

  return (
    <>
      <PageHeader title="Orders" description="All marketplace orders" />

      {/* Filters row */}
      <div className="mb-4">
        <Suspense fallback={<div className="h-10 w-96 bg-zinc-100 rounded animate-pulse" />}>
          <OrderFilters />
        </Suspense>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-4">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50 hover:bg-zinc-50">
              <TableHead className="w-48 font-medium text-zinc-600">Order ID</TableHead>
              <TableHead className="font-medium text-zinc-600">Customer</TableHead>
              <TableHead className="font-medium text-zinc-600">Date</TableHead>
              <TableHead className="font-medium text-zinc-600">Status</TableHead>
              <TableHead className="text-right font-medium text-zinc-600">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!data || data.list.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-zinc-400">
                  {error ? "Could not load orders." : "No orders found."}
                </TableCell>
              </TableRow>
            ) : (
              data.list.map((order) => (
                <TableRow
                  key={order.orderId}
                  className="hover:bg-zinc-50 cursor-pointer"
                >
                  <TableCell className="font-mono text-xs">
                    <Link
                      href={`/orders/${encodeURIComponent(order.orderId)}`}
                      className="text-indigo-600 hover:text-indigo-800 hover:underline font-medium"
                    >
                      {order.orderId}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-zinc-700">
                    {order.clientName || "—"}
                  </TableCell>
                  <TableCell className="text-sm text-zinc-500">
                    {formatDate(order.creationDate)}
                  </TableCell>
                  <TableCell>
                    <OrderStatusBadge status={order.status} />
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium text-zinc-900">
                    {formatPrice(order.totalValue)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {data && data.paging.pages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-zinc-500">
            Showing {(page - 1) * PER_PAGE + 1}–
            {Math.min(page * PER_PAGE, data.paging.total)} of{" "}
            {data.paging.total} orders
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              asChild
              disabled={page <= 1}
            >
              <Link
                href={buildPageUrl(params, page - 1)}
                aria-disabled={page <= 1}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Link>
            </Button>
            <span className="text-sm text-zinc-500 px-2">
              Page {page} of {data.paging.pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              asChild
              disabled={page >= data.paging.pages}
            >
              <Link
                href={buildPageUrl(params, page + 1)}
                aria-disabled={page >= data.paging.pages}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

function buildPageUrl(
  params: { q?: string; status?: string; page?: string },
  newPage: number
): string {
  const p = new URLSearchParams();
  if (params.q) p.set("q", params.q);
  if (params.status) p.set("status", params.status);
  p.set("page", String(newPage));
  return `/orders?${p.toString()}`;
}
