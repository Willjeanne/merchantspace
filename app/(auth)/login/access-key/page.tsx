import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthToken } from "@/lib/auth/session";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AccessKeyPageProps {
  searchParams: Promise<{ error?: string; detail?: string }>;
}

const ERROR_MESSAGES: Record<string, string> = {
  invalid_email: "Please enter a valid email address.",
  send_failed: "Failed to send the access key. Please try again.",
  session_expired: "Your session has expired. Please start again.",
};

export default async function AccessKeyPage({ searchParams }: AccessKeyPageProps) {
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
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary shadow-sm">
                <span className="text-primary-foreground text-lg font-bold">MS</span>
              </div>
              <div className="text-center">
                <h1 className="text-2xl font-bold text-zinc-900">Sign in with email</h1>
                <p className="mt-1 text-sm text-zinc-500">
                  We&apos;ll send a one-time code to your inbox
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

            <form action="/api/auth/accesskey/send" method="POST" className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium text-zinc-700">
                  Email address
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@vtex.com"
                  required
                  autoFocus
                  className="w-full"
                />
              </div>
              <Button type="submit" className="w-full" size="lg">
                Send access key
              </Button>
            </form>

            <div className="text-center">
              <Link
                href="/login"
                className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                ← Back to sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
