/** Response from POST /api/vtexid/credential/validate */
export interface VtexUser {
  id: string;
  user: string; // email address
  account: string;
  audience: string;
  tokenType: string;
  authStatus: string;
}

/** Response from POST /api/vtexid/audience/{account}/{env}/webstore/provider/oauth/exchange */
export interface VtexAuthToken {
  authToken: string;
}

/** Response from GET /api/vtexid/pub/authentication/start */
export interface VtexAuthStart {
  authenticationToken: string;
  isAuthenticated: boolean;
  showClassicAuthentication: boolean;
  showAccessKeyAuthentication: boolean;
  showPasskeyAuthentication: boolean;
  oauthProviders: VtexOAuthProvider[];
  selectedProvider: string | null;
  authCookie: string | null;
}

export interface VtexOAuthProvider {
  className: string;
  providerName: string;
  expectedContext: string[];
}

/** Optional response from POST /api/vtexid/pub/authentication/accesskey/validate */
export interface VtexAccessKeyValidateResponse {
  authToken?: string;
}

/** Stored in the vtex_user httpOnly cookie after auth */
export interface SessionUser {
  email: string;
  id: string;
}
