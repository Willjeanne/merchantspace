import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE } from "@/lib/auth/session";

export function proxy(request: NextRequest): NextResponse {
  const authToken = request.cookies.get(AUTH_COOKIE)?.value;

  if (!authToken) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/orders/:path*",
    "/catalog/:path*",
    "/fulfillment/:path*",
    "/onboarding/:path*",
    "/settings/:path*",
  ],
};
