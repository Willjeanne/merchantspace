import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthToken } from "@/lib/auth/session";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface LoginPageProps {
  searchParams: Promise<{ error?: string; detail?: string }>;
}

const ERROR_MESSAGES: Record<string, string> = {
  google_denied: "Google sign-in was cancelled.",
  google_failed: "Google authentication failed. Please try again.",
  vtex_exchange_failed:
    "Could not authenticate with VTEX. Make sure your account has access to this portal.",
  invalid_token: "Your session is invalid. Please sign in again.",
  csrf: "Security check failed. Please try again.",
  auth_failed: "Authentication failed. Please try again.",
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  // Redirect if already authenticated
  const token = await getAuthToken();
  if (token) redirect("/dashboard");

  const { error, detail } = await searchParams;
  const errorMessage = error ? (ERROR_MESSAGES[error] ?? "An error occurred.") : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm">
        <Card className="shadow-md border-zinc-200">
          <CardHeader className="pb-4 pt-8 px-8">
            <div className="flex flex-col items-center gap-4">
              {/* Logo */}
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary shadow-sm">
                <span className="text-primary-foreground text-lg font-bold">MS</span>
              </div>
              <div className="text-center">
                <h1 className="text-2xl font-bold text-zinc-900">MerchantSpace</h1>
                <p className="mt-1 text-sm text-zinc-500">
                  Seller portal powered by VTEX
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="px-8 pb-8 space-y-4">
            {errorMessage && (
              <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 space-y-1">
                <p className="text-sm text-red-700">{errorMessage}</p>
                {detail && (
                  <p className="text-xs text-red-500 font-mono break-all">{detail}</p>
                )}
              </div>
            )}

            {/* Primary: Google sign-in */}
            <Button asChild className="w-full" size="lg">
              <Link href="/api/auth/start">
                <GoogleIcon />
                Sign in with Google
              </Link>
            </Button>

            {/* Fallback: access key */}
            <div className="text-center">
              <Link
                href="/login/access-key"
                className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                Use access key instead
              </Link>
            </div>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-zinc-400">
          For authorized VTEX staff only
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg
      className="w-4 h-4 mr-2"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}
