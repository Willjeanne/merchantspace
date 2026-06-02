import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { getOrder } from "@/lib/vtex/orders";
import { formatPrice, formatDate, formatDateTime } from "@/lib/format";
import { VtexNotFoundError } from "@/lib/vtex/client";
import { ArrowLeft, Package, MapPin, CreditCard, User } from "lucide-react";
import Image from "next/image";

interface OrderDetailPageProps {
  params: Promise<{ orderId: string }>;
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const { orderId } = await params;
  const decodedId = decodeURIComponent(orderId);

  let order;
  try {
    order = await getOrder(decodedId);
  } catch (err) {
    if (err instanceof VtexNotFoundError) notFound();
    throw err;
  }

  const client = order.clientProfileData;
  const shipping = order.shippingData;
  const address = shipping?.address;
  const payments = order.paymentData?.transactions?.flatMap((t) => t.payments) ?? [];

  // Totals breakdown
  const itemsTotal = order.totals.find((t) => t.id === "Items")?.value ?? 0;
  const shippingTotal = order.totals.find((t) => t.id === "Shipping")?.value ?? 0;
  const discountsTotal = order.totals.find((t) => t.id === "Discounts")?.value ?? 0;
  const taxTotal = order.totals.find((t) => t.id === "Tax")?.value ?? 0;

  return (
    <>
      {/* Back + header */}
      <div className="mb-2">
        <Link
          href="/orders"
          className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-600 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Orders
        </Link>
      </div>

      <PageHeader
        title={`Order ${order.orderId}`}
        description={`Placed on ${formatDateTime(order.creationDate)}`}
        actions={<OrderStatusBadge status={order.status} className="text-sm px-3 py-1" />}
      />

      <div className="grid grid-cols-3 gap-6 mt-2">
        {/* ── Left column: Items ── */}
        <div className="col-span-2 space-y-6">
          {/* Items table */}
          <section className="bg-white rounded-lg border border-zinc-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-zinc-100 flex items-center gap-2">
              <Package className="w-4 h-4 text-zinc-400" />
              <h2 className="text-sm font-semibold text-zinc-700">
                Items ({order.items.length})
              </h2>
            </div>
            <div className="divide-y divide-zinc-100">
              {order.items.map((item) => (
                <div key={item.uniqueId} className="flex items-center gap-4 px-5 py-4">
                  {/* Product image */}
                  <div className="relative w-14 h-14 rounded-md border border-zinc-200 overflow-hidden bg-zinc-50 shrink-0">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        fill
                        className="object-contain p-1"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-300">
                        <Package className="w-6 h-6" />
                      </div>
                    )}
                  </div>

                  {/* Product info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-800 truncate">{item.name}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">{item.skuName}</p>
                    {item.refId && (
                      <p className="text-xs text-zinc-400">Ref: {item.refId}</p>
                    )}
                  </div>

                  {/* Qty + price */}
                  <div className="text-right shrink-0">
                    <p className="text-sm text-zinc-500">
                      {item.quantity} × {formatPrice(item.sellingPrice)}
                    </p>
                    <p className="text-sm font-semibold text-zinc-900 mt-0.5">
                      {formatPrice(item.sellingPrice * item.quantity)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* ── Right column: Summary cards ── */}
        <div className="space-y-4">
          {/* Order totals */}
          <section className="bg-white rounded-lg border border-zinc-200 p-5">
            <h2 className="text-sm font-semibold text-zinc-700 mb-3">Order Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-zinc-600">
                <span>Subtotal</span>
                <span>{formatPrice(itemsTotal)}</span>
              </div>
              {shippingTotal !== 0 && (
                <div className="flex justify-between text-zinc-600">
                  <span>Shipping</span>
                  <span>{formatPrice(shippingTotal)}</span>
                </div>
              )}
              {discountsTotal !== 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discounts</span>
                  <span>{formatPrice(discountsTotal)}</span>
                </div>
              )}
              {taxTotal !== 0 && (
                <div className="flex justify-between text-zinc-600">
                  <span>Tax</span>
                  <span>{formatPrice(taxTotal)}</span>
                </div>
              )}
              <div className="border-t border-zinc-100 pt-2 mt-2 flex justify-between font-semibold text-zinc-900">
                <span>Total</span>
                <span>{formatPrice(order.value)}</span>
              </div>
            </div>
          </section>

          {/* Customer */}
          <section className="bg-white rounded-lg border border-zinc-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <User className="w-4 h-4 text-zinc-400" />
              <h2 className="text-sm font-semibold text-zinc-700">Customer</h2>
            </div>
            <div className="space-y-1 text-sm">
              <p className="font-medium text-zinc-800">
                {client.firstName} {client.lastName}
              </p>
              <p className="text-zinc-500">{client.email}</p>
              {client.phone && <p className="text-zinc-500">{client.phone}</p>}
              {client.document && (
                <p className="text-zinc-400 text-xs">
                  {client.documentType}: {client.document}
                </p>
              )}
            </div>
          </section>

          {/* Shipping address */}
          {address && (
            <section className="bg-white rounded-lg border border-zinc-200 p-5">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-4 h-4 text-zinc-400" />
                <h2 className="text-sm font-semibold text-zinc-700">Shipping Address</h2>
              </div>
              <div className="text-sm text-zinc-600 space-y-0.5">
                <p className="font-medium text-zinc-800">{address.receiverName}</p>
                <p>
                  {address.street}
                  {address.number ? `, ${address.number}` : ""}
                </p>
                {address.complement && <p>{address.complement}</p>}
                {address.neighborhood && <p>{address.neighborhood}</p>}
                <p>
                  {address.postalCode} {address.city}
                </p>
                <p>{address.state}, {address.country}</p>
              </div>
              {shipping?.logisticsInfo?.[0] && (
                <div className="mt-3 pt-3 border-t border-zinc-100 text-xs text-zinc-400">
                  <p>
                    Method:{" "}
                    <span className="text-zinc-600 font-medium">
                      {shipping.logisticsInfo[0].selectedSla}
                    </span>
                  </p>
                  <p className="mt-0.5">
                    Estimate:{" "}
                    <span className="text-zinc-600">
                      {shipping.logisticsInfo[0].shippingEstimate}
                    </span>
                  </p>
                </div>
              )}
            </section>
          )}

          {/* Payment */}
          {payments.length > 0 && (
            <section className="bg-white rounded-lg border border-zinc-200 p-5">
              <div className="flex items-center gap-2 mb-3">
                <CreditCard className="w-4 h-4 text-zinc-400" />
                <h2 className="text-sm font-semibold text-zinc-700">Payment</h2>
              </div>
              <div className="space-y-2">
                {payments.map((p, i) => (
                  <div key={i} className="text-sm">
                    <p className="text-zinc-700 font-medium">{p.paymentSystemName}</p>
                    <p className="text-zinc-500 text-xs">
                      {formatPrice(p.value)}
                      {p.installments > 1 ? ` · ${p.installments}× installments` : ""}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Sellers */}
          {order.sellers?.length > 0 && (
            <section className="bg-white rounded-lg border border-zinc-200 p-5">
              <h2 className="text-sm font-semibold text-zinc-700 mb-2">Sellers</h2>
              <div className="space-y-1">
                {order.sellers.map((s) => (
                  <p key={s.id} className="text-sm text-zinc-600">
                    {s.name}{" "}
                    <span className="text-zinc-400 text-xs">({s.id})</span>
                  </p>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
