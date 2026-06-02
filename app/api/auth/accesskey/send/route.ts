import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { startVtexAuth, sendAccessKey } from "@/lib/auth/vtex-id";
import { setAkStateCookie } from "@/lib/auth/session";

const NEXTAUTH_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const email = formData.get("email");

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.redirect(`${NEXTAUTH_URL}/login/access-key?error=invalid_email`);
    }

    // 1. Start VTEX auth → get authenticationToken
    const { authenticationToken } = await startVtexAuth();

    // 2. Send OTP to user's email
    await sendAccessKey(email.trim(), authenticationToken);

    // 3. Store state (email + authenticationToken) in httpOnly cookie
    const cookieStore = await cookies();
    setAkStateCookie(cookieStore, { email: email.trim(), authenticationToken });

    return NextResponse.redirect(
      `${NEXTAUTH_URL}/login/access-key/verify?sent=1`
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[Auth/AK/Send] Error: ${message}`);
    const detail = encodeURIComponent(message.slice(0, 300));
    return NextResponse.redirect(
      `${NEXTAUTH_URL}/login/access-key?error=send_failed&detail=${detail}`
    );
  }
}
