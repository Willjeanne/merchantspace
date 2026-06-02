import type { VtexAuthStart, VtexAuthToken, VtexUser, VtexAccessKeyValidateResponse } from "@/lib/types/auth";

const VTEX_ACCOUNT = process.env.VTEX_ACCOUNT!;
const VTEX_ENVIRONMENT = process.env.VTEX_ENVIRONMENT ?? "vtexcommercestable";
const BASE = `https://${VTEX_ACCOUNT}.${VTEX_ENVIRONMENT}.com.br`;

/** GET /api/vtexid/pub/authentication/start?scope={account} (ID: 3122) */
export async function startVtexAuth(): Promise<VtexAuthStart> {
  const url = `${BASE}/api/vtexid/pub/authentication/start?scope=${VTEX_ACCOUNT}`;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`VTEX auth start failed: ${res.status}`);
  }
  return res.json() as Promise<VtexAuthStart>;
}

/**
 * POST /api/vtexid/audience/{account}/{env}/webstore/provider/oauth/exchange (ID: 3115)
 * Exchanges a Google access_token for a VTEX authToken.
 */
export async function exchangeGoogleToken(googleAccessToken: string): Promise<string> {
  const url = `${BASE}/api/vtexid/audience/${VTEX_ACCOUNT}/${VTEX_ENVIRONMENT}/webstore/provider/oauth/exchange`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      providerId: "Google",
      accessToken: googleAccessToken,
      duration: 120,
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`VTEX exchange failed (${res.status}): ${body}`);
  }
  const data = (await res.json()) as VtexAuthToken;
  if (!data.authToken) {
    throw new Error(`VTEX exchange no token: ${JSON.stringify(data)}`);
  }
  return data.authToken;
}

/**
 * POST /api/vtexid/pub/authentication/accesskey/send (ID: 3123)
 * Sends an OTP to the user's email. Pass authenticationToken as _vss cookie.
 */
export async function sendAccessKey(email: string, authenticationToken: string): Promise<void> {
  const url = `${BASE}/api/vtexid/pub/authentication/accesskey/send?email=${encodeURIComponent(email)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Cookie: `_vss=${authenticationToken}`,
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`VTEX send access key failed (${res.status}): ${body}`);
  }
}

/**
 * POST /api/vtexid/pub/authentication/accesskey/validate (ID: 3124)
 * Validates the OTP. Returns authToken (from body or falls back to authenticationToken).
 */
export async function validateAccessKey(
  login: string,
  accessKey: string,
  authenticationToken: string
): Promise<string> {
  const url = `${BASE}/api/vtexid/pub/authentication/accesskey/validate`;
  const formData = new FormData();
  formData.append("login", login);
  formData.append("accessKey", accessKey);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Cookie: `_vss=${authenticationToken}`,
    },
    body: formData,
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`VTEX validate access key failed (${res.status}): ${body}`);
  }

  // Capture full response for debugging + token extraction
  const setCookieHeader = res.headers.get("set-cookie") ?? "";
  const text = await res.text().catch(() => "");
  console.log(`[VTEX/AK/Validate] body=${text.slice(0, 500)} | set-cookie=${setCookieHeader.slice(0, 300)}`);

  // Try to parse authToken or token fields from response body
  if (text) {
    try {
      const data = JSON.parse(text) as Record<string, unknown>;
      const token =
        (data.authToken as string | undefined) ??
        (data.token as string | undefined) ??
        (data.accessToken as string | undefined);
      if (token) return token;
    } catch {
      // not JSON — fall through
    }
  }

  // authenticationToken is now "proven" (OTP matched) — caller will use email from state
  return authenticationToken;
}

/**
 * POST /api/vtexid/credential/validate (ID: 3116)
 * Validates a VTEX auth token and returns user info.
 */
export async function validateVtexToken(authToken: string): Promise<VtexUser> {
  const url = `${BASE}/api/vtexid/credential/validate?an=${VTEX_ACCOUNT}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ token: authToken }),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`VTEX token validation failed: ${res.status}`);
  }
  return res.json() as Promise<VtexUser>;
}
