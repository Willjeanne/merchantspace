/**
 * Formatting utilities for MerchantSpace.
 * VTEX stores monetary values in cents (divide by 100 for display).
 */

/** Format cents to EUR currency string — e.g. 123456 → "1 234,56 €" */
export function formatPrice(cents: number, currency = "EUR"): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

/** Format ISO date to short date — e.g. "2026-05-22T..." → "22 May 2026" */
export function formatDate(isoDate: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(isoDate));
}

/** Format ISO date to date + time — e.g. "22 May 2026, 14:30" */
export function formatDateTime(isoDate: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(isoDate));
}

/** Format a VTEX order ID to a shorter display form */
export function formatOrderId(orderId: string): string {
  return orderId;
}
