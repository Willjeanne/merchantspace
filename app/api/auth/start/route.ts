import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { buildGoogleAuthUrl, generateState } from "@/lib/auth/google";
import { STATE_COOKIE } from "@/lib/auth/session";

export async function GET(): Promise<NextResponse> {
  const state = generateState();
  const googleUrl = buildGoogleAuthUrl(state);

  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax", // must be lax (not strict) to survive the Google OAuth redirect
    maxAge: 60 * 5, // 5 minutes
    path: "/",
  });

  return NextResponse.redirect(googleUrl);
}
