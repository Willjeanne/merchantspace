import type { LegalInfo } from "@/lib/types/onboarding";

/**
 * Build a LegalInfo summary string for display in the recap step.
 */
export function buildSellerSummary(info: Partial<LegalInfo>): string {
  return [
    info.companyName,
    info.siren ? `SIREN: ${info.siren}` : null,
    info.vatNumber ? `TVA: ${info.vatNumber}` : null,
    info.city ? `${info.city}, ${info.country}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}
