import { vtexSellerFetch } from "@/lib/vtex/client";

/**
 * Shipping policies on the seller account, via `/api/logistics/pvt/shipping-policies`.
 *
 * This is a DIFFERENT surface from the `/api/logistics/pvt/configuration/carriers`
 * that `getShippingPolicies()` in lib/vtex/catalog.ts reads for the Fulfillment
 * page. Both describe the same underlying objects — verified on
 * franceretailer1388, where policy `1` / "Standard Delivery" appears identically
 * in both — but only this one is writable, and its read shape is
 * `{ items, paging }` rather than a flat array. Writes and reads here stay on the
 * same resource so an id from a read is always valid for a write.
 *
 * Warehouses, docks and the carriers read all still live in lib/vtex/catalog.ts,
 * which is past 1100 lines; extracting the logistics half of it is worth doing,
 * separately from this feature.
 */

export interface VtexMaxDimension {
  largestMeasure: number;
  maxMeasureSum: number;
}

export interface VtexWeekendAndHolidays {
  saturday: boolean;
  sunday: boolean;
  holiday: boolean;
}

export interface VtexShippingPolicy {
  id: string;
  name: string;
  shippingMethod: string;
  isActive: boolean;
  weekendAndHolidays: VtexWeekendAndHolidays;
  maxDimension: VtexMaxDimension;
  numberOfItemsPerShipment: number;
  minimumValueAceptable: number;
  maximumValueAceptable: number;
  deliveryChannel?: string;
  // Settings blobs are echoed back verbatim on update (see updateShippingPolicy),
  // so they are typed as opaque rather than modelled field by field.
  modalSettings?: unknown;
  cubicWeightSettings?: unknown;
  deliveryScheduleSettings?: unknown;
  businessHourSettings?: unknown;
  pickupPointsSettings?: unknown;
  carrierSchedule?: unknown;
  carrierInfo?: {
    carrierAccountName: string;
    /**
     * ⚠️ Only populated by the LIST endpoint. Verified on franceretailer1388,
     * policy `1`: the list returns `[{ id: "1", name: "Station d'accueil
     * principal" }]` while `GET .../shipping-policies/1` returns `[]` for the
     * same policy. Read dock links from `listShippingPolicies()`, never from
     * `getShippingPolicy()`.
     */
    linkedDocks: Array<{ id: string; name: string }>;
    readyToUse: boolean;
  };
}

export interface VtexShippingPoliciesListResponse {
  items: VtexShippingPolicy[];
  paging?: { total: number; page: number; perPage: number; pages: number };
}

/** Everything a caller may set when creating a policy. The rest is defaulted. */
export interface CreateShippingPolicyInput {
  /** Client-assigned: the create endpoint requires the id in the body. */
  id: string;
  name: string;
  shippingMethod: string;
  isActive?: boolean;
  deliverySaturday?: boolean;
  deliverySunday?: boolean;
  deliveryHoliday?: boolean;
  numberOfItemsPerShipment?: number;
  minimumValueAceptable?: number;
  maximumValueAceptable?: number;
  largestMeasure?: number;
  maxMeasureSum?: number;
}

/** Fields a caller may change. Omitted ones keep their current value. */
export interface UpdateShippingPolicyInput {
  name?: string;
  shippingMethod?: string;
  isActive?: boolean;
  deliverySaturday?: boolean;
  deliverySunday?: boolean;
  deliveryHoliday?: boolean;
  numberOfItemsPerShipment?: number;
  minimumValueAceptable?: number;
  maximumValueAceptable?: number;
  largestMeasure?: number;
  maxMeasureSum?: number;
}

/** Open all week, which is what VTEX itself writes for a policy with no restriction. */
const ALL_WEEK_BUSINESS_HOURS = Array.from({ length: 7 }, (_, dayOfWeek) => ({
  dayOfWeek,
  openingTime: "00:00:00",
  closingTime: "23:59:59",
}));

/**
 * GET /api/logistics/pvt/shipping-policies
 * Errors are not swallowed: an empty `items` means no policy, and a failure
 * means a failure.
 */
export async function listShippingPolicies(): Promise<VtexShippingPoliciesListResponse> {
  const result = await vtexSellerFetch<VtexShippingPoliciesListResponse>(
    "/api/logistics/pvt/shipping-policies"
  );
  return { items: result?.items ?? [], paging: result?.paging };
}

/**
 * GET /api/logistics/pvt/shipping-policies/{id}
 * Undocumented in the API reference index but live (verified 200 on
 * franceretailer1388), which is what makes the read-modify-write below possible.
 */
export async function getShippingPolicy(id: string): Promise<VtexShippingPolicy> {
  return vtexSellerFetch<VtexShippingPolicy>(
    `/api/logistics/pvt/shipping-policies/${encodeURIComponent(id)}`
  );
}

/**
 * POST /api/logistics/pvt/shipping-policies
 *
 * The endpoint requires fourteen top-level fields. Only the ones a person
 * actually decides are exposed; the others are filled with the "no special
 * configuration" values VTEX itself stores for an unrestricted policy — no
 * scheduled delivery, no cubic weight factor, no modal, open all week, no
 * pickup points.
 */
export async function createShippingPolicy(
  input: CreateShippingPolicyInput
): Promise<VtexShippingPolicy> {
  const body = {
    id: input.id,
    name: input.name,
    shippingMethod: input.shippingMethod,
    isActive: input.isActive ?? true,
    weekendAndHolidays: {
      saturday: input.deliverySaturday ?? false,
      sunday: input.deliverySunday ?? false,
      holiday: input.deliveryHoliday ?? false,
    },
    maxDimension: {
      largestMeasure: input.largestMeasure ?? 0,
      maxMeasureSum: input.maxMeasureSum ?? 0,
    },
    numberOfItemsPerShipment: input.numberOfItemsPerShipment ?? 1,
    minimumValueAceptable: input.minimumValueAceptable ?? 0,
    maximumValueAceptable: input.maximumValueAceptable ?? 0,
    deliveryScheduleSettings: {
      useDeliverySchedule: false,
      dayOfWeekForDelivery: [],
      maxRangeDelivery: 0,
    },
    cubicWeightSettings: {
      volumetricFactor: 0,
      minimunAcceptableVolumetricWeight: 0,
    },
    modalSettings: { modals: [], useOnlyItemsWithDefinedModal: false },
    businessHourSettings: {
      carrierBusinessHours: ALL_WEEK_BUSINESS_HOURS,
      isOpenOutsideBusinessHours: true,
    },
    pickupPointsSettings: { pickupPointIds: [], pickupPointTags: [], sellers: [] },
  };

  await vtexSellerFetch<unknown>("/api/logistics/pvt/shipping-policies", {
    method: "POST",
    body: JSON.stringify(body),
  });

  return getShippingPolicy(input.id);
}

/**
 * PUT /api/logistics/pvt/shipping-policies/{id}
 *
 * 🔴 This endpoint is a full REPLACE, not a patch, and the OpenAPI spec for it is
 * wrong in two ways. Both were established against franceretailer1388:
 *
 * 1. The spec requires `deliveryOnWeekends`, a single boolean. That field is
 *    INERT: a PUT carrying `deliveryOnWeekends: true` returns 200 and leaves
 *    `weekendAndHolidays` at all-false. The field that actually works is
 *    `weekendAndHolidays` — the same object the GET and the POST use — even
 *    though the spec does not list it for PUT at all.
 * 2. Any writable field left out of the body is RESET, not preserved. Omitting
 *    `numberOfItemsPerShipment` from an otherwise valid PUT took it from `5` to
 *    `null`, and omitting `weekendAndHolidays` wiped the weekend flags.
 *
 * So the whole writable record is read, merged with the requested changes, and
 * sent back — the same read-modify-write the rest of lib/vtex uses. Sending only
 * the fields being changed silently destroys the rest of the policy.
 */
export async function updateShippingPolicy(
  id: string,
  updates: UpdateShippingPolicyInput
): Promise<VtexShippingPolicy> {
  const current = await getShippingPolicy(id);

  const body = {
    id: current.id,
    name: updates.name ?? current.name,
    shippingMethod: updates.shippingMethod ?? current.shippingMethod,
    isActive: updates.isActive ?? current.isActive,
    weekendAndHolidays: {
      saturday: updates.deliverySaturday ?? current.weekendAndHolidays?.saturday ?? false,
      sunday: updates.deliverySunday ?? current.weekendAndHolidays?.sunday ?? false,
      holiday: updates.deliveryHoliday ?? current.weekendAndHolidays?.holiday ?? false,
    },
    maxDimension: {
      largestMeasure: updates.largestMeasure ?? current.maxDimension?.largestMeasure ?? 0,
      maxMeasureSum: updates.maxMeasureSum ?? current.maxDimension?.maxMeasureSum ?? 0,
    },
    numberOfItemsPerShipment:
      updates.numberOfItemsPerShipment ?? current.numberOfItemsPerShipment ?? 1,
    minimumValueAceptable:
      updates.minimumValueAceptable ?? current.minimumValueAceptable ?? 0,
    maximumValueAceptable:
      updates.maximumValueAceptable ?? current.maximumValueAceptable ?? 0,
    // Echoed verbatim: leaving any of these out resets them.
    deliveryScheduleSettings: current.deliveryScheduleSettings ?? {
      useDeliverySchedule: false,
      dayOfWeekForDelivery: [],
      maxRangeDelivery: 0,
    },
    cubicWeightSettings: current.cubicWeightSettings ?? {
      volumetricFactor: 0,
      minimunAcceptableVolumetricWeight: 0,
    },
    modalSettings: current.modalSettings ?? {
      modals: [],
      useOnlyItemsWithDefinedModal: false,
    },
    businessHourSettings: current.businessHourSettings ?? {
      carrierBusinessHours: ALL_WEEK_BUSINESS_HOURS,
      isOpenOutsideBusinessHours: true,
    },
    pickupPointsSettings: current.pickupPointsSettings ?? {
      pickupPointIds: [],
      pickupPointTags: [],
      sellers: [],
    },
    carrierSchedule: current.carrierSchedule ?? [],
  };

  await vtexSellerFetch<unknown>(
    `/api/logistics/pvt/shipping-policies/${encodeURIComponent(id)}`,
    { method: "PUT", body: JSON.stringify(body) }
  );

  return getShippingPolicy(id);
}
