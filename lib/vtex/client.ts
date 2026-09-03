const VTEX_ACCOUNT = process.env.VTEX_ACCOUNT;
const VTEX_ENVIRONMENT = process.env.VTEX_ENVIRONMENT ?? "vtexcommercestable";
const VTEX_APP_KEY = process.env.VTEX_APP_KEY;
const VTEX_APP_TOKEN = process.env.VTEX_APP_TOKEN;

const VTEX_SELLER_ACCOUNT = process.env.VTEX_SELLER_ACCOUNT;
const VTEX_SELLER_APP_KEY = process.env.VTEX_SELLER_APP_KEY;
const VTEX_SELLER_APP_TOKEN = process.env.VTEX_SELLER_APP_TOKEN;

function getBaseUrl(): string {
  if (!VTEX_ACCOUNT) throw new VtexConfigError("VTEX_ACCOUNT is not set");
  return `https://${VTEX_ACCOUNT}.${VTEX_ENVIRONMENT}.com.br`;
}

function getSellerBaseUrl(): string {
  if (!VTEX_SELLER_ACCOUNT) throw new VtexConfigError("VTEX_SELLER_ACCOUNT is not set");
  return `https://${VTEX_SELLER_ACCOUNT}.${VTEX_ENVIRONMENT}.com.br`;
}

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export class VtexConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VtexConfigError";
  }
}

export class VtexApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly endpoint: string
  ) {
    super(message);
    this.name = "VtexApiError";
  }
}

export class VtexUnauthorizedError extends VtexApiError {
  constructor(endpoint: string, message = "Unauthorized — check App Key / App Token") {
    super(401, message, endpoint);
    this.name = "VtexUnauthorizedError";
  }
}

export class VtexNotFoundError extends VtexApiError {
  constructor(endpoint: string) {
    super(404, `Resource not found: ${endpoint}`, endpoint);
    this.name = "VtexNotFoundError";
  }
}

export class VtexRateLimitError extends VtexApiError {
  constructor(endpoint: string) {
    super(429, "VTEX rate limit exceeded", endpoint);
    this.name = "VtexRateLimitError";
  }
}

export class VtexServerError extends VtexApiError {
  constructor(status: number, endpoint: string, detail?: string) {
    super(status, detail ?? `VTEX server error (${status})`, endpoint);
    this.name = "VtexServerError";
  }
}

// ---------------------------------------------------------------------------
// Core fetch wrapper
// ---------------------------------------------------------------------------

export async function vtexFetch<T>(
  path: string,
  options: RequestInit & { headers?: Record<string, string> } = {}
): Promise<T> {
  if (!VTEX_APP_KEY || !VTEX_APP_TOKEN) {
    throw new VtexConfigError("VTEX_APP_KEY or VTEX_APP_TOKEN is not set");
  }

  const url = `${getBaseUrl()}${path}`;
  const isFormData = options.body instanceof FormData;
  const baseHeaders: Record<string, string> = {
    // Don't set Content-Type for FormData — fetch sets it automatically with the boundary
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    Accept: "application/json",
    "X-VTEX-API-AppKey": VTEX_APP_KEY,
    "X-VTEX-API-AppToken": VTEX_APP_TOKEN,
  };
  const headers = Object.assign(baseHeaders, options.headers ?? {});

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    const endpoint = path;
    switch (response.status) {
      case 401:
      case 403:
        console.warn(`[VTEX] 401/403 on ${endpoint}`);
        throw new VtexUnauthorizedError(endpoint);
      case 404:
        throw new VtexNotFoundError(endpoint);
      case 429:
        console.warn(`[VTEX] Rate limit hit on ${endpoint}`);
        throw new VtexRateLimitError(endpoint);
      default: {
        const body = await response.text().catch(() => "");
        if (response.status >= 500) {
          let detail = "";
          try {
            const json = JSON.parse(body);
            detail = json.Message || json.message || json.error || json.errors?.[0] || "";
          } catch {
            detail = body.slice(0, 300);
          }
          const msg = detail ? `VTEX server error (${response.status}): ${detail}` : `VTEX server error (${response.status})`;
          // Use warn (not error) — many endpoints legitimately return 500 on Seller Portal
          // accounts where the classic Catalog API is unavailable. Callers handle these
          // via .catch() fallbacks so they are expected, not unexpected.
          console.warn(`[VTEX] ${msg} on ${endpoint}`);
          throw new VtexServerError(response.status, endpoint, msg);
        }
        console.warn(`[VTEX] ${response.status} on ${endpoint}: ${body}`);
        throw new VtexApiError(response.status, body || response.statusText, endpoint);
      }
    }
  }

  assertJsonResponse(response, path);

  return parseVtexBody<T>(response);
}

// ---------------------------------------------------------------------------
// Pagination helpers
// ---------------------------------------------------------------------------

/**
 * Fetch using the SELLER account credentials (VTEX_SELLER_ACCOUNT).
 * Used for catalog management: create/edit products, SKUs in the seller's account.
 */
export async function vtexSellerFetch<T>(
  path: string,
  options: RequestInit & { headers?: Record<string, string> } = {}
): Promise<T> {
  if (!VTEX_SELLER_APP_KEY || !VTEX_SELLER_APP_TOKEN) {
    throw new VtexConfigError("VTEX_SELLER_APP_KEY or VTEX_SELLER_APP_TOKEN is not set");
  }

  const url = `${getSellerBaseUrl()}${path}`;
  const isFormData = options.body instanceof FormData;
  const baseHeaders: Record<string, string> = {
    // Don't set Content-Type for FormData — fetch sets it automatically with the boundary
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    Accept: "application/json",
    "X-VTEX-API-AppKey": VTEX_SELLER_APP_KEY,
    "X-VTEX-API-AppToken": VTEX_SELLER_APP_TOKEN,
  };
  const headers = Object.assign(baseHeaders, options.headers ?? {});
  // Disable Next.js fetch cache for seller catalog calls (data changes frequently)
  const response = await fetch(url, { ...options, headers, cache: "no-store" });

  if (!response.ok) {
    const endpoint = path;
    switch (response.status) {
      case 401:
      case 403:
        console.warn(`[VTEX/Seller] 401/403 on ${endpoint}`);
        throw new VtexUnauthorizedError(endpoint);
      case 404:
        throw new VtexNotFoundError(endpoint);
      case 429:
        throw new VtexRateLimitError(endpoint);
      default: {
        const body = await response.text().catch(() => "");
        if (response.status >= 500) {
          let detail = "";
          try {
            const json = JSON.parse(body);
            detail = json.Message || json.message || json.error || json.errors?.[0] || "";
          } catch {
            detail = body.slice(0, 300);
          }
          const msg = detail ? `VTEX server error (${response.status}): ${detail}` : `VTEX server error (${response.status})`;
          // warn (not error) — classic Catalog endpoints legitimately 500 on Seller Portal accounts
          console.warn(`[VTEX/Seller] ${msg} on ${endpoint}`);
          throw new VtexServerError(response.status, endpoint, msg);
        }
        throw new VtexApiError(response.status, body || response.statusText, endpoint);
      }
    }
  }

  assertJsonResponse(response, path);

  return parseVtexBody<T>(response);
}

/**
 * Rejects an HTML body on an endpoint that must answer JSON.
 *
 * When an App Key lacks the License Manager resource a private endpoint needs,
 * some VTEX APIs redirect to the Admin login page instead of answering 401.
 * fetch follows the chain, so the caller gets a 200 carrying a login form and
 * JSON.parse fails with "Unexpected token '<'" — a permission problem disguised
 * as a parsing bug.
 *
 * Detection is on the content type, not the URL: the observed chain for
 * `GET /seller-register/pvt/*` on franceretail is four hops ending at
 * `/admin/login/?portal=true`, nothing like the `/Admin/Site/Login.aspx` the
 * first 302 advertises. Every wrapper here sends `Accept: application/json` and
 * every caller goes through `parseVtexBody`, so an HTML body is always wrong.
 */
function assertJsonResponse(response: Response, endpoint: string): void {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("text/html")) return;

  const isAdminLogin = /\/admin\/(site\/)?login/i.test(response.url ?? "");
  throw new VtexUnauthorizedError(
    endpoint,
    isAdminLogin
      ? `VTEX answered ${endpoint} with the Admin login page instead of JSON: the App ` +
          `Key is missing the License Manager resource this endpoint requires. This is a ` +
          `permission to grant, not a code error.`
      : `VTEX answered ${endpoint} with HTML instead of JSON (content-type ` +
          `"${contentType}"). This usually means the request was redirected to a login ` +
          `or error page because the App Key lacks the required permission.`
  );
}

/**
 * Reads a successful VTEX response body. Some write endpoints answer 200 with
 * an empty body rather than 204 — `PUT /api/pricing/prices/{skuId}` does — so
 * calling `.json()` unconditionally throws "Unexpected end of JSON input" on a
 * call that actually succeeded.
 */
async function parseVtexBody<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;
  const body = await response.text();
  if (body.trim() === "") return undefined as T;
  return JSON.parse(body) as T;
}

/** OMS / Catalog: REST-Range header → "resources=0-49" */
export function buildVtexRange(from: number, to: number): Record<string, string> {
  return { "REST-Range": `resources=${from}-${to}` };
}

/** Master Data v2: _from / _to query params */
export function buildVtexPagination(
  page: number,
  pageSize: number
): Record<string, string> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  return { _from: String(from), _to: String(to) };
}

/** Serialize an object to URL query string (skips undefined/null) */
export function toQueryString(params: Record<string, string | number | boolean | undefined | null>): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null
  ) as [string, string | number | boolean][];
  if (entries.length === 0) return "";
  return "?" + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
}
