"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TopNav } from "@/components/shared/top-nav";
import { LevelBadge } from "@/components/shared/level-badge";
import { ChallengeDayIcon } from "@/components/shared/challenge-day-icon";
import { DailyWheel } from "@/components/shared/daily-wheel";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Flame, Star, Check } from "lucide-react";
import type { LevelKey } from "@/lib/levels";

interface HomeData {
  currentDay: number;
  dayMeta: { title: string; subtitle: string; icon: string } | null;
  level: LevelKey | null;
  levelLocked: boolean;
  challenges: {
    id: string;
    title: string;
    subtitle: string | null;
    type: string;
    basePoints: number;
    questionCount: number;
    userStatus: "not_started" | "in_progress" | "submitted" | "expired";
    earnedPoints: number | null;
  }[];
  missions: { id: string; title: string; icon: string | null; points: number }[];
  dayStreak: number;
  wheelCanSpin: boolean;
}

interface MeData {
  name: string;
  level: LevelKey | null;
  levelLocked: boolean;
}

export default function HomePage() {
  const router = useRouter();
  const [me, setMe] = useState<MeData | null>(null);
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wheelResult, setWheelResult] = useState<{ points: number; label: string } | null>(null);

  function handleWheelSpun(points: number, label: string) {
    setWheelResult({ points, label });
    setData((prev) => (prev ? { ...prev, wheelCanSpin: false } : prev));
  }

  useEffect(() => {
    (async () => {
      let meRes: Response;
      try {
        meRes = await fetch("/api/me");
      } catch {
        setError("Couldn't reach the server. Is it running?");
        setLoading(false);
        return;
      }
      if (!meRes.ok) {
        setError("Couldn't load your account. Please try logging in again.");
        setLoading(false);
        return;
      }
      const meData = await meRes.json().catch(() => null);
      if (!meData || !meData.user) {
        router.push("/onboarding");
        return;
      }
      if (!meData.user.levelLocked) {
        router.push("/onboarding/level");
        return;
      }
      setMe(meData.user);

      const homeRes = await fetch("/api/home");
      if (!homeRes.ok) {
        setError("Couldn't load today's challenges.");
        setLoading(false);
        return;
      }
      setData(await homeRes.json());
      setLoading(false);
    })();
  }, [router]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!data || !me) return null;

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <TopNav userName={me.name} level={me.level} />

      <div className="mx-auto max-w-5xl px-5 py-10">
        <p className="font-[family-name:var(--font-mono)] text-sm text-[var(--muted)] uppercase tracking-wide">
          Welcome, {me.name}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="font-[family-name:var(--font-display)] text-3xl uppercase">Current level:</h1>
          <LevelBadge level={me.level} locked size="lg" />
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3 font-[family-name:var(--font-mono)]">
          <span className="text-xs font-bold px-3 py-1.5 border-2 border-[var(--line)] bg-[var(--yellow)] text-black uppercase tracking-wide">
            Day {data.currentDay} of 7
          </span>
          {data.dayStreak > 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 border-2 border-[var(--line)] uppercase tracking-wide">
              <Flame size={13} strokeWidth={2.5} className="text-[var(--yellow)]" fill="currentColor" />
              {data.dayStreak} day streak
            </span>
          )}
        </div>

        {data.dayMeta && (
          <p className="mt-4 flex items-center gap-3 font-[family-name:var(--font-display)] text-2xl uppercase">
            <ChallengeDayIcon icon={data.dayMeta.icon} size={24} className="text-[var(--blue)]" />
            {data.dayMeta.title}
          </p>
        )}

        <h2 className="mt-10 font-[family-name:var(--font-mono)] text-xs font-bold uppercase tracking-[0.3em] text-[var(--muted)]">
          Today&apos;s missions
        </h2>

        {data.challenges.length === 0 ? (
          <Card className="mt-4 p-8 text-center text-[var(--muted)] font-[family-name:var(--font-mono)]">
            Today&apos;s challenge hasn&apos;t started yet. Check back soon.
          </Card>
        ) : (
          <div className="mt-4 grid sm:grid-cols-2 border-2 border-[var(--line)] divide-y-2 sm:divide-y-0 sm:divide-x-2 divide-[var(--line)]">
            {data.challenges.map((c) => (
              <ChallengeCard key={c.id} challenge={c} />
            ))}
          </div>
        )}

        <h2 className="mt-10 font-[family-name:var(--font-mono)] text-xs font-bold uppercase tracking-[0.3em] text-[var(--muted)]">
          Daily wheel
        </h2>
        <Card className="mt-4 p-8 flex flex-col items-center">
          <DailyWheel canSpin={data.wheelCanSpin} onSpun={handleWheelSpun} />
          {wheelResult && (
            <p className="mt-5 font-[family-name:var(--font-mono)] font-bold text-[var(--green)] text-center">
              You won {wheelResult.label}! (+{wheelResult.points} XP)
            </p>
          )}
        </Card>

        {data.missions.length > 0 && (
          <>
            <h2 className="mt-10 font-[family-name:var(--font-mono)] text-xs font-bold uppercase tracking-[0.3em] text-[var(--muted)]">
              Bonus missions
            </h2>
            <div className="mt-4 grid sm:grid-cols-3 border-2 border-[var(--line)] divide-y-2 sm:divide-y-0 sm:divide-x-2 divide-[var(--line)]">
              {data.missions.map((m) => (
                <div key={m.id} className="p-4 flex items-center gap-3 bg-[var(--paper)]">
                  <Star size={20} strokeWidth={2} className="text-[var(--yellow)] shrink-0" fill="currentColor" />
                  <div>
                    <p className="font-semibold text-sm">{m.title}</p>
                    <p className="font-[family-name:var(--font-mono)] text-xs font-bold text-[var(--blue)]">
                      +{m.points} XP
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function ChallengeCard({ challenge }: { challenge: HomeData["challenges"][number] }) {
  const done = challenge.userStatus === "submitted";
  return (
    <div className="p-6 bg-[var(--paper)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-[family-name:var(--font-display)] text-xl uppercase leading-tight">{challenge.title}</p>
          {challenge.subtitle && <p className="text-sm text-[var(--muted)] mt-1">{challenge.subtitle}</p>}
        </div>
        {done && (
          <span className="shrink-0 inline-flex items-center gap-1 font-[family-name:var(--font-mono)] text-xs font-bold px-2 py-1 border-2 border-[var(--line)] bg-[var(--green)] text-black">
            <Check size={13} strokeWidth={3} />
            Done
          </span>
        )}
      </div>
      <p className="mt-3 font-[family-name:var(--font-mono)] text-xs text-[var(--muted)]">
        {challenge.questionCount} questions · base {challenge.basePoints} pts/question
      </p>
      {done ? (
        <p className="mt-4 font-[family-name:var(--font-mono)] font-bold text-[var(--green)]">
          +{challenge.earnedPoints} XP earned
        </p>
      ) : (
        <Link href={`/challenge/${challenge.id}`}>
          <Button className="mt-4 w-full">
            {challenge.userStatus === "in_progress" ? "Resume challenge" : "Start challenge"}
          </Button>
        </Link>
      )}
    </div>
  );
}

function LoadingState() {
  return (
    <main className="min-h-screen bg-[var(--bg)] px-5 py-16">
      <div className="mx-auto max-w-5xl animate-pulse space-y-4 font-[family-name:var(--font-mono)]">
        <div className="h-6 w-40 bg-[var(--line)]/10 border-2 border-[var(--line)]" />
        <div className="h-10 w-72 bg-[var(--line)]/10 border-2 border-[var(--line)]" />
        <div className="grid sm:grid-cols-2 gap-0 mt-8 border-2 border-[var(--line)]">
          {[1, 2].map((i) => (
            <div key={i} className="h-40 bg-[var(--line)]/5" />
          ))}
        </div>
      </div>
    </main>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <main className="min-h-screen bg-[var(--bg)] grid place-items-center px-5">
      <div className="text-center font-[family-name:var(--font-mono)]">
        <p className="text-lg font-bold">{message}</p>
        <Button className="mt-4" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    </main>
  );
}
