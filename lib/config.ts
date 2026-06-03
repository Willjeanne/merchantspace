/**
 * Central config — all account names come from env vars, never hardcoded.
 * Server-side values (VTEX_*) are safe for Server Components and Route Handlers.
 * Public values (NEXT_PUBLIC_*) are inlined at build time and safe for Client Components.
 */

// ─── Server-side (Server Components, Route Handlers, Server Actions) ──────────

export const MARKETPLACE_ACCOUNT =
  process.env.VTEX_ACCOUNT ?? "your-marketplace-account";

export const SELLER_ACCOUNT =
  process.env.VTEX_SELLER_ACCOUNT ?? process.env.VTEX_SELLER_ID ?? "your-seller-account";

export const SELLER_ID =
  process.env.VTEX_SELLER_ID ?? process.env.VTEX_SELLER_ACCOUNT ?? "your-seller-id";

// ─── Client-side (Client Components — inlined at build time) ─────────────────

export const PUBLIC_MARKETPLACE_ACCOUNT =
  process.env.NEXT_PUBLIC_VTEX_ACCOUNT ?? "your-marketplace-account";

export const PUBLIC_SELLER_ACCOUNT =
  process.env.NEXT_PUBLIC_VTEX_SELLER_ACCOUNT ?? "your-seller-account";
