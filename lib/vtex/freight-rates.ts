import { vtexSellerFetch } from "@/lib/vtex/client";

/**
 * Freight rates — the "shipping rate table" of a shipping policy.
 *
 * VTEX calls a shipping policy a "carrier" here, so `carrierId` in these paths
 * is the shipping policy id from lib/vtex/shipping-policies.ts.
 *
 * Semantics established against franceretailer1388, policy `2`:
 *  - `operationType: 1` is a true UPSERT on the row key (postal-code range +
 *    weight range + country). Re-sending an identical row does not duplicate it;
 *    re-sending it with a different price updates it (5 → 9 observed).
 *  - `operationType: 2` also updates.
 *  - `operationType: 3` deletes that row and leaves the others alone.
 *
 * Consequence for the tool surface: writes never need to read the table first,
 * which matters because THE TABLE CANNOT BE READ AS A WHOLE. Reads are keyed by
 * postal code (`/{carrierId}/{postalCode}/values`); `/{carrierId}/values`
 * answers 500. So a write is an upsert of the rows you name — rows you do not
 * mention stay exactly as they are. It is not a replace.
 */

/** Postal codes are stored left-zero-padded to 8 digits: 10000 → "00010000". */
const POSTAL_CODE_LENGTH = 8;

/** 1000 kg if weights are grams — a catch-all upper bound. Verified accepted. */
const DEFAULT_WEIGHT_END = 1_000_000;

/** cm³. Mirrors what VTEX itself stores for an unrestricted row. */
const DEFAULT_MAX_VOLUME = 1_000_000_000;

/** The account's sales channel is FRA/EUR; override per row when needed. */
const DEFAULT_COUNTRY = "FRA";

/** A rate row as a caller states it: euros and days, postal codes as written. */
export interface FreightRateInput {
  /** As a human writes it, e.g. "01000" or "1000". Padded to 8 digits. */
  postalCodeStart: string;
  postalCodeEnd: string;
  /** Fixed cost in the account currency, e.g. 5 or 5.9 — not cents. */
  price: number;
  /** Delivery time in days. Default 1. */
  deliveryDays?: number;
  weightStart?: number;
  weightEnd?: number;
  /** Percentage of the order total added to shipping, e.g. 10 for 10%. */
  pricePercent?: number;
  pricePercentByWeight?: number;
  maxVolume?: number;
  /** Three-letter ISO code. Default FRA. */
  country?: string;
}

/** The wire shape. `operationType`: 1 upsert, 2 update, 3 delete. */
interface FreightValuePayload {
  zipCodeStart: string;
  zipCodeEnd: string;
  weightStart: number;
  weightEnd: number;
  absoluteMoneyCost: string;
  pricePercent: number;
  pricePercentByWeight: number;
  maxVolume: number;
  timeCost: string;
  country: string;
  polygon: string;
  operationType: 1 | 2 | 3;
}

/**
 * A rate row as VTEX returns it. Note this is NOT the write shape: it carries
 * `level`, `zipCodeOrigin*`, `zipCodeDestination*`, `restrictedFreights`,
 * `polygonOrigin`, `minimumValueInsurance` and `operationType: 0`, none of which
 * the write endpoint accepts. Never echo a read row straight back.
 */
export interface VtexFreightRate {
  zipCodeStart: string;
  zipCodeEnd: string;
  weightStart: number;
  weightEnd: number;
  /** A number on read, a decimal string on write. */
  absoluteMoneyCost: number;
  pricePercent: number;
  pricePercentByWeight: number;
  maxVolume: number;
  timeCost: string;
  country: string;
  polygon: string;
}

/** The diagnostic essentials of a freight table, from the carriers listing. */
export interface VtexFreightTableStatus {
  id: string;
  name: string;
  isActive: boolean;
  deliveryChannel: string;
  /** Non-null when the table failed to load — VTEX's own wording. */
  freightTableValueError: string | null;
  freightTableProcessStatus: number;
  weekendAndHolidays: { saturday: boolean; sunday: boolean; holiday: boolean };
  numberOfItemsPerShipment: number;
}

function padPostalCode(value: string): string {
  const digits = String(value).replace(/\D/g, "");
  if (!digits) throw new Error(`Postal code "${value}" contains no digits.`);
  if (digits.length > POSTAL_CODE_LENGTH) {
    throw new Error(
      `Postal code "${value}" is longer than ${POSTAL_CODE_LENGTH} digits once stripped.`
    );
  }
  return digits.padStart(POSTAL_CODE_LENGTH, "0");
}

/**
 * Rejects ranges that overlap or run backwards, before anything is sent.
 *
 * Overlapping postal-code ranges are the easiest mistake to make when dictating
 * a table in prose, and VTEX does not always refuse them — it just picks a row,
 * so a quote silently comes out at the wrong price. Rows are compared within the
 * same weight band and country, since those legitimately separate rates.
 */
function assertNoOverlap(rows: FreightValuePayload[]): void {
  for (const row of rows) {
    if (row.zipCodeStart > row.zipCodeEnd) {
      throw new Error(
        `Postal code range ${row.zipCodeStart}–${row.zipCodeEnd} runs backwards.`
      );
    }
  }
  for (let i = 0; i < rows.length; i += 1) {
    for (let j = i + 1; j < rows.length; j += 1) {
      const a = rows[i];
      const b = rows[j];
      const sameBand =
        a.country === b.country &&
        a.weightStart === b.weightStart &&
        a.weightEnd === b.weightEnd;
      if (!sameBand) continue;
      if (a.zipCodeStart <= b.zipCodeEnd && b.zipCodeStart <= a.zipCodeEnd) {
        throw new Error(
          `Postal code ranges overlap for country ${a.country}, weight ` +
            `${a.weightStart}–${a.weightEnd}: ${a.zipCodeStart}–${a.zipCodeEnd} and ` +
            `${b.zipCodeStart}–${b.zipCodeEnd}. Nothing was sent.`
        );
      }
    }
  }
}

function toPayload(
  input: FreightRateInput,
  operationType: 1 | 3
): FreightValuePayload {
  if (!Number.isFinite(input.price) || input.price < 0) {
    throw new Error(`Price "${input.price}" is not a positive number.`);
  }
  return {
    zipCodeStart: padPostalCode(input.postalCodeStart),
    zipCodeEnd: padPostalCode(input.postalCodeEnd),
    weightStart: input.weightStart ?? 0,
    weightEnd: input.weightEnd ?? DEFAULT_WEIGHT_END,
    // Decimal string: that is what the write contract asks for, and it is
    // accepted (sent "5.00", read back 5).
    absoluteMoneyCost: input.price.toFixed(2),
    pricePercent: input.pricePercent ?? 0,
    pricePercentByWeight: input.pricePercentByWeight ?? 0,
    maxVolume: input.maxVolume ?? DEFAULT_MAX_VOLUME,
    timeCost: `${input.deliveryDays ?? 1}.00:00:00`,
    country: input.country ?? DEFAULT_COUNTRY,
    polygon: "",
    operationType,
  };
}

/**
 * GET /api/logistics/pvt/configuration/freights
 * Every shipping policy with the state of its freight table. This is where a
 * policy that produces no quote explains itself: an empty table shows up as
 * `freightTableValueError: "No files to proccess..."`.
 */
export async function listFreightTables(): Promise<VtexFreightTableStatus[]> {
  const raw = await vtexSellerFetch<VtexFreightTableStatus[]>(
    "/api/logistics/pvt/configuration/freights"
  );
  return (Array.isArray(raw) ? raw : []).map((t) => ({
    id: t.id,
    name: t.name,
    isActive: t.isActive,
    deliveryChannel: t.deliveryChannel,
    freightTableValueError: t.freightTableValueError,
    freightTableProcessStatus: t.freightTableProcessStatus,
    weekendAndHolidays: t.weekendAndHolidays,
    numberOfItemsPerShipment: t.numberOfItemsPerShipment,
  }));
}

/**
 * GET /api/logistics/pvt/configuration/freights/{policyId}/{postalCode}/values
 * The rate rows covering ONE postal code. There is no way to read the whole
 * table, so this answers "what would this address be charged", not "show me
 * everything I configured".
 */
export async function getFreightRates(
  policyId: string,
  postalCode: string
): Promise<VtexFreightRate[]> {
  const raw = await vtexSellerFetch<VtexFreightRate[]>(
    `/api/logistics/pvt/configuration/freights/${encodeURIComponent(policyId)}/` +
      `${encodeURIComponent(padPostalCode(postalCode))}/values`
  );
  // Trimmed to the fields that carry meaning. The raw row also returns a dozen
  // always-null origin/destination/polygon fields and `operationType: 0`, which
  // are noise in a tool result and are not accepted on the way back in.
  return (Array.isArray(raw) ? raw : []).map((r) => ({
    zipCodeStart: r.zipCodeStart,
    zipCodeEnd: r.zipCodeEnd,
    weightStart: r.weightStart,
    weightEnd: r.weightEnd,
    absoluteMoneyCost: r.absoluteMoneyCost,
    pricePercent: r.pricePercent,
    pricePercentByWeight: r.pricePercentByWeight,
    maxVolume: r.maxVolume,
    timeCost: r.timeCost,
    country: r.country,
    polygon: r.polygon,
  }));
}

/**
 * POST /api/logistics/pvt/configuration/freights/{policyId}/values/update
 *
 * Upserts the given rows. Rows not listed are left untouched — this is not a
 * replace. Answers 204 with no body, so the affected postal codes are read back
 * and returned.
 */
export async function setFreightRates(
  policyId: string,
  rates: FreightRateInput[]
): Promise<{ policyId: string; written: number; verified: VtexFreightRate[] }> {
  if (!rates.length) throw new Error("No rates given. Nothing was sent.");

  const payload = rates.map((r) => toPayload(r, 1));
  assertNoOverlap(payload);

  await vtexSellerFetch<void>(
    `/api/logistics/pvt/configuration/freights/${encodeURIComponent(policyId)}/values/update`,
    { method: "POST", body: JSON.stringify(payload) }
  );

  return {
    policyId,
    written: payload.length,
    verified: await readBackRates(policyId, payload),
  };
}

/**
 * Same endpoint with `operationType: 3`. Only the named rows go; the row key is
 * the postal-code range plus weight range plus country, so those must match the
 * existing row for the delete to bite.
 */
export async function deleteFreightRates(
  policyId: string,
  rates: FreightRateInput[]
): Promise<{ policyId: string; deleted: number; remaining: VtexFreightRate[] }> {
  if (!rates.length) throw new Error("No rates given. Nothing was sent.");

  const payload = rates.map((r) => toPayload(r, 3));

  await vtexSellerFetch<void>(
    `/api/logistics/pvt/configuration/freights/${encodeURIComponent(policyId)}/values/update`,
    { method: "POST", body: JSON.stringify(payload) }
  );

  return {
    policyId,
    deleted: payload.length,
    remaining: await readBackRates(policyId, payload),
  };
}

/**
 * Reads back one postal code per written row, retrying while the table is still
 * being processed.
 *
 * Freight tables carry a `freightTableProcessStatus`, and every other write in
 * this codebase turned out to propagate asynchronously (OMS transitions ~6s,
 * dock updates ~1s). Measured here: rows were visible about 4s after a 204.
 */
async function readBackRates(
  policyId: string,
  written: FreightValuePayload[]
): Promise<VtexFreightRate[]> {
  const probes = [...new Set(written.map((r) => r.zipCodeStart))];
  let rows: VtexFreightRate[] = [];

  for (const delay of [1500, 2500, 4000]) {
    const found = await Promise.all(probes.map((cp) => getFreightRates(policyId, cp)));
    rows = found.flat();
    if (rows.length) return rows;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  return rows;
}
