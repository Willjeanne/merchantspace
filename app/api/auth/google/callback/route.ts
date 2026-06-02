import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeGoogleCode } from "@/lib/auth/google";
import { exchangeGoogleToken, validateVtexToken } from "@/lib/auth/vtex-id";
import { setAuthCookies, STATE_COOKIE } from "@/lib/auth/session";
import type { SessionUser } from "@/lib/types/auth";

const NEXTAUTH_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const cookieStore = await cookies();
  const storedState = cookieStore.get(STATE_COOKIE)?.value;

  // User denied Google access
  if (error) {
    console.error(`[Auth] Google OAuth error: ${error}`);
    return NextResponse.redirect(`${NEXTAUTH_URL}/login?error=google_denied`);
  }

  // CSRF check
  if (!state || !storedState || state !== storedState) {
    console.error("[Auth] CSRF state mismatch");
    return NextResponse.redirect(`${NEXTAUTH_URL}/login?error=csrf`);
  }

  if (!code) {
    return NextResponse.redirect(`${NEXTAUTH_URL}/login?error=google_failed`);
  }

  try {
    // 1. Exchange Google code → access_token
    const { access_token: googleAccessToken } = await exchangeGoogleCode(code);

    // 2. Exchange Google access_token → VTEX authToken
    const authToken = await exchangeGoogleToken(googleAccessToken);

    // 3. Validate VTEX token → get user info (called once, result cached in cookie)
    const vtexUser = await validateVtexToken(authToken);

    if (vtexUser.authStatus !== "Success") {
      console.error(`[Auth] VTEX auth status: ${vtexUser.authStatus}`);
      const statusDetail = encodeURIComponent(`authStatus=${vtexUser.authStatus}`);
      return NextResponse.redirect(`${NEXTAUTH_URL}/login?error=vtex_exchange_failed&detail=${statusDetail}`);
    }

    const sessionUser: SessionUser = { email: vtexUser.user, id: vtexUser.id };
    setAuthCookies(cookieStore, authToken, sessionUser);

    return NextResponse.redirect(`${NEXTAUTH_URL}/dashboard`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[Auth] Callback error: ${message}`);

    // Surface more specific error if recognizable
    const detail = encodeURIComponent(message.slice(0, 300));
    if (message.includes("exchange failed")) {
      return NextResponse.redirect(`${NEXTAUTH_URL}/login?error=vtex_exchange_failed&detail=${detail}`);
    }
    if (message.includes("validation failed")) {
      return NextResponse.redirect(`${NEXTAUTH_URL}/login?error=invalid_token&detail=${detail}`);
    }
    return NextResponse.redirect(`${NEXTAUTH_URL}/login?error=auth_failed&detail=${detail}`);
  }
}
