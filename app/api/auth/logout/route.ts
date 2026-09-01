import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { clearAuthCookies } from "@/lib/auth/session";
import { getRequestOrigin } from "@/lib/utils/request";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const cookieStore = await cookies();
  clearAuthCookies(cookieStore);
  return NextResponse.redirect(`${getRequestOrigin(request)}/login`);
}
