import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { validateAccessKey } from "@/lib/auth/vtex-id";
import { setAuthCookies, getAkState, AK_STATE_COOKIE } from "@/lib/auth/session";
import type { SessionUser } from "@/lib/types/auth";

const NEXTAUTH_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const cookieStore = await cookies();

  try {
    const formData = await request.formData();
    const code = formData.get("code");

    if (!code || typeof code !== "string" || code.trim().length === 0) {
      return NextResponse.redirect(
        `${NEXTAUTH_URL}/login/access-key/verify?error=invalid_code`
      );
    }

    // Read state cookie
    const akState = getAkState(cookieStore);
    if (!akState) {
      return NextResponse.redirect(
        `${NEXTAUTH_URL}/login/access-key?error=session_expired`
      );
    }

    const { email, authenticationToken } = akState;

    // 1. Validate OTP with VTEX — throws if code is wrong
    //    Returns authToken from response body if available, otherwise authenticationToken
    const authToken = await validateAccessKey(email, code.trim(), authenticationToken);

    // 2. OTP validated → email ownership is proven.
    //    We use the email from the state cookie (verified by VTEX sending OTP there).
    //    All VTEX API calls are server-side with App Key/Token — no user token needed.
    const sessionUser: SessionUser = { email, id: email };

    // 3. Set auth cookies, clear AK state cookie
    setAuthCookies(cookieStore, authToken, sessionUser);
    cookieStore.delete(AK_STATE_COOKIE);

    return NextResponse.redirect(`${NEXTAUTH_URL}/dashboard`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[Auth/AK/Validate] Error: ${message}`);
    const detail = encodeURIComponent(message.slice(0, 300));

    if (message.includes("validate access key failed")) {
      return NextResponse.redirect(
        `${NEXTAUTH_URL}/login/access-key/verify?error=invalid_code&detail=${detail}`
      );
    }
    return NextResponse.redirect(
      `${NEXTAUTH_URL}/login/access-key/verify?error=auth_failed&detail=${detail}`
    );
  }
}
