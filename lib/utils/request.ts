import { getPublicOrigin } from "mcp-handler";

/**
 * Resolves the app's own base URL for building same-app redirects (auth flows).
 *
 * Prefers NEXTAUTH_URL when set — required for Google OAuth's redirect_uri,
 * which must exactly match what's registered in Google Cloud Console — and
 * otherwise falls back to the incoming request's public origin (respecting
 * X-Forwarded-Host/Proto, via mcp-handler's proxy-aware helper — plain
 * `request.url` reflects the server's own bind address, not the client-visited
 * host, once behind Vercel's proxy). That means production, every Vercel
 * preview deployment, and localhost all redirect correctly without updating
 * an env var per deployment.
 */
export function getRequestOrigin(request: Request): string {
  return process.env.NEXTAUTH_URL || getPublicOrigin(request);
}
