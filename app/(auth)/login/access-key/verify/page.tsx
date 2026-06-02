import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthToken } from "@/lib/auth/session";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface VerifyPageProps {
  searchParams: Promise<{ sent?: string; error?: string; detail?: string }>;
}

const ERROR_MESSAGES: Record<string, string> = {
  invalid_code: "Invalid code. Please check the email and try again.",
  vtex_auth_failed: "Authentication failed with VTEX. Please try again.",
  auth_failed: "Authentication failed. Please try again.",
  session_expired: "Your session expired. Please start again.",
};

export default async function VerifyPage({ searchParams }: VerifyPageProps) {
  const token = await getAuthToken();
  if (token) redirect("/dashboard");

  const { sent, error, detail } = await searchParams;
  const errorMessage = error ? (ERROR_MESSAGES[error] ?? "An error occurred.") : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm">
        <Card className="shadow-md border-zinc-200">
          <CardHeader className="pb-4 pt-8 px-8">
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary shadow-sm">
                <span className="text-primary-foreground text-lg font-bold">MS</span>
              </div>
              <div className="text-center">
                <h1 className="text-2xl font-bold text-zinc-900">Check your email</h1>
                <p className="mt-1 text-sm text-zinc-500">
                  Enter the 6-digit code we sent you
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="px-8 pb-8 space-y-4">
            {sent && !error && (
              <div className="rounded-md bg-green-50 border border-green-200 px-4 py-3">
                <p className="text-sm text-green-700">
                  Access key sent! Check your inbox.
                </p>
              </div>
            )}

            {errorMessage && (
              <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 space-y-1">
                <p className="text-sm text-red-700">{errorMessage}</p>
                {detail && (
                  <p className="text-xs text-red-500 font-mono break-all">{detail}</p>
                )}
              </div>
            )}

            <form action="/api/auth/accesskey/validate" method="POST" className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="code" className="text-sm font-medium text-zinc-700">
                  Access key
                </Label>
                <Input
                  id="code"
                  name="code"
                  type="text"
                  inputMode="numeric"
                  placeholder="123456"
                  maxLength={8}
                  required
                  autoFocus
                  className="w-full tracking-widest text-center text-lg font-mono"
                />
              </div>
              <Button type="submit" className="w-full" size="lg">
                Verify &amp; sign in
              </Button>
            </form>

            <div className="text-center">
              <Link
                href="/login/access-key"
                className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                ← Use a different email / resend
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
