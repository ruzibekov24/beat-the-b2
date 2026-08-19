"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const ERROR_MESSAGES: Record<string, string> = {
  oauth_state: "Login session expired. Please try again.",
  google_failed: "Google sign-in failed. Please try again.",
  email_unverified: "Please use a verified Google account.",
};

type BotLoginState = "idle" | "waiting" | "expired" | "error";

export default function OnboardingPage() {
  return (
    <Suspense fallback={null}>
      <OnboardingPageInner />
    </Suspense>
  );
}

function OnboardingPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [botState, setBotState] = useState<BotLoginState>("idle");
  const [deepLink, setDeepLink] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const errCode = searchParams.get("error");
    if (errCode) setError(ERROR_MESSAGES[errCode] ?? "Something went wrong. Please try again.");
  }, [searchParams]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  function googleHref() {
    const ref = searchParams.get("ref");
    return ref ? `/api/auth/google?ref=${encodeURIComponent(ref)}` : "/api/auth/google";
  }

  async function startBotLogin() {
    setError(null);
    setBotState("waiting");
    try {
      const referralCode = searchParams.get("ref") ?? undefined;
      const res = await fetch("/api/auth/telegram-bot/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referralCode }),
      });
      if (!res.ok) {
        setBotState("error");
        setError("Could not start Telegram login. Please try again.");
        return;
      }
      const data = await res.json();
      setDeepLink(data.deepLink);
      window.open(data.deepLink, "_blank");

      pollRef.current = setInterval(async () => {
        const statusRes = await fetch(`/api/auth/telegram-bot/status?token=${data.token}`);
        const statusData = await statusRes.json();

        if (statusData.status === "confirmed") {
          if (pollRef.current) clearInterval(pollRef.current);
          router.push(statusData.redirectTo);
        } else if (statusData.status === "expired") {
          if (pollRef.current) clearInterval(pollRef.current);
          setBotState("expired");
        }
      }, 2000);
    } catch {
      setBotState("error");
      setError("Network error. Please try again.");
    }
  }

  return (
    <main className="min-h-screen bg-[var(--bg)] flex items-center justify-center px-5 py-16">
      <div className="w-full max-w-md">
        <p className="font-[family-name:var(--font-mono)] text-xs font-bold text-[var(--blue)] uppercase tracking-widest text-center">
          Step 1 of 3
        </p>
        <Card className="mt-3 p-8">
          <h1 className="font-[family-name:var(--font-display)] text-3xl uppercase text-center">
            Who&apos;s
            <br />
            competing?
          </h1>
          <p className="mt-3 text-[var(--muted)] text-center text-sm">
            Sign in to register for the competition. No fake accounts, no duplicates.
          </p>

          {error && (
            <p className="mt-4 font-[family-name:var(--font-mono)] text-sm text-[var(--red)] text-center">
              {error}
            </p>
          )}

          {botState === "idle" && (
            <>
              <Button className="w-full mt-7" size="lg" onClick={startBotLogin}>
                Continue with Telegram
              </Button>
              <p className="mt-3 text-center font-[family-name:var(--font-mono)] text-[10px] text-[var(--muted)] uppercase tracking-widest">
                Opens Telegram — tap Start, then come back here
              </p>

              <div className="mt-6 flex items-center gap-3">
                <div className="flex-1 h-px bg-[var(--line)]" />
                <span className="font-[family-name:var(--font-mono)] text-xs text-[var(--muted)] uppercase">or</span>
                <div className="flex-1 h-px bg-[var(--line)]" />
              </div>

              <a href={googleHref()} className="block mt-6">
                <Button className="w-full" variant="secondary">
                  Continue with Google
                </Button>
              </a>
            </>
          )}

          {botState === "waiting" && (
            <div className="mt-7 text-center">
              <p className="font-[family-name:var(--font-mono)] text-sm text-[var(--muted)] animate-pulse">
                Waiting for confirmation in Telegram…
              </p>
              {deepLink && (
                <a
                  href={deepLink}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-block font-[family-name:var(--font-mono)] text-xs text-[var(--blue)] underline"
                >
                  Didn&apos;t open? Tap here
                </a>
              )}
              <Button
                variant="secondary"
                className="w-full mt-6"
                onClick={() => {
                  if (pollRef.current) clearInterval(pollRef.current);
                  setBotState("idle");
                }}
              >
                Cancel
              </Button>
            </div>
          )}

          {(botState === "expired" || botState === "error") && (
            <div className="mt-7 text-center">
              <p className="font-[family-name:var(--font-mono)] text-sm text-[var(--red)]">
                {botState === "expired" ? "Login link expired." : "Something went wrong."}
              </p>
              <Button className="w-full mt-4" onClick={() => setBotState("idle")}>
                Try again
              </Button>
            </div>
          )}
        </Card>

        <p className="mt-6 text-xs text-[var(--muted)] text-center font-[family-name:var(--font-mono)] uppercase tracking-wide">
          One entry per person. Choose wisely.
        </p>
      </div>
    </main>
  );
}
