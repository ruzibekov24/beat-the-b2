"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TelegramLoginButton } from "@/components/shared/telegram-login-button";

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

const BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;

export default function TelegramOnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleTelegramAuth(telegramUser: TelegramUser) {
    setLoading(true);
    setError(null);
    try {
      const referralCode = new URLSearchParams(window.location.search).get("ref") ?? undefined;
      const res = await fetch("/api/auth/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...telegramUser, referralCode }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Telegram verification failed. Please try again, or use Google instead.");
        setLoading(false);
        return;
      }

      const data = await res.json();
      router.push(data.user.levelLocked ? "/home" : "/onboarding/level");
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
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
            Sign in with
            <br />
            Telegram
          </h1>
          <p className="mt-3 text-[var(--muted)] text-center text-sm">
            Telegram&apos;s login can occasionally be slow to deliver the confirmation code.
            If it doesn&apos;t arrive within a minute or two, use Google instead.
          </p>

          <div className="mt-8">
            {BOT_USERNAME ? (
              <TelegramLoginButton botUsername={BOT_USERNAME} onAuth={handleTelegramAuth} />
            ) : (
              <p className="font-[family-name:var(--font-mono)] text-sm text-[var(--red)] text-center">
                Telegram login is not configured.
              </p>
            )}
          </div>

          {loading && (
            <p className="mt-4 text-center font-[family-name:var(--font-mono)] text-sm text-[var(--muted)]">
              Verifying with Telegram…
            </p>
          )}
          {error && (
            <p className="mt-4 text-center font-[family-name:var(--font-mono)] text-sm text-[var(--red)]">
              {error}
            </p>
          )}

          <a href="/onboarding" className="block mt-6">
            <Button className="w-full" variant="secondary">
              ← Back to Google sign-in
            </Button>
          </a>
        </Card>
      </div>
    </main>
  );
}
