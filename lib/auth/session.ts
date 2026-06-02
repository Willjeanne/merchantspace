import { cookies } from "next/headers";
import type { SessionUser } from "@/lib/types/auth";

export const AUTH_COOKIE = "vtex_auth";
export const USER_COOKIE = "vtex_user";
export const STATE_COOKIE = "vtex_auth_state";
export const AK_STATE_COOKIE = "vtex_ak_state"; // access-key flow state

export interface AccessKeyState {
  email: string;
  authenticationToken: string;
}

const COOKIE_MAX_AGE = 60 * 120; // 120 minutes in seconds

export async function getAuthToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(AUTH_COOKIE)?.value ?? null;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const raw = store.get(USER_COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export function setAuthCookies(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
  authToken: string,
  user: SessionUser
): void {
  const opts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  };
  cookieStore.set(AUTH_COOKIE, authToken, opts);
  cookieStore.set(USER_COOKIE, JSON.stringify(user), opts);
}

export function clearAuthCookies(
  cookieStore: Awaited<ReturnType<typeof cookies>>
): void {
  cookieStore.delete(AUTH_COOKIE);
  cookieStore.delete(USER_COOKIE);
  cookieStore.delete(STATE_COOKIE);
  cookieStore.delete(AK_STATE_COOKIE);
}

export function setAkStateCookie(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
  state: AccessKeyState
): void {
  cookieStore.set(AK_STATE_COOKIE, JSON.stringify(state), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 60 * 10, // 10 minutes
    path: "/",
  });
}

export function getAkState(
  cookieStore: Awaited<ReturnType<typeof cookies>>
): AccessKeyState | null {
  const raw = cookieStore.get(AK_STATE_COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AccessKeyState;
  } catch {
    return null;
  }
}
