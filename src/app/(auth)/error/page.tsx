"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import Button from "@/components/ui/Button";

const errorMessages: Record<string, string> = {
  Configuration: "Server configuration error. Check that OAuth credentials are set in .env.local.",
  AccessDenied: "Access was denied. You may have cancelled the login or the OAuth app is not configured correctly.",
  Verification: "The verification link has expired or has already been used.",
  Default: "An error occurred during sign-in.",
};

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error") || "Default";
  const message = errorMessages[error] || errorMessages.Default;

  return (
    <main className="bg-black min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <h1 className="text-xl font-semibold text-white mb-2">Sign-in failed</h1>
        <p className="text-white/40 text-sm mb-6">{message}</p>
        <div className="space-y-3">
          <Link href="/login">
            <Button className="w-full">Try again</Button>
          </Link>
          <Link href="/">
            <Button variant="ghost" className="w-full">
              Back to home
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense
      fallback={
        <main className="bg-black min-h-screen flex items-center justify-center px-6">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        </main>
      }
    >
      <ErrorContent />
    </Suspense>
  );
}
