import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { clearAuthCookies } from "@/lib/auth/session";

const NEXTAUTH_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

export async function GET(): Promise<NextResponse> {
  const cookieStore = await cookies();
  clearAuthCookies(cookieStore);
  return NextResponse.redirect(`${NEXTAUTH_URL}/login`);
}
