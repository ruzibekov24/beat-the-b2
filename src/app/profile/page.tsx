"use client";

import { useEffect, useState } from "react";
import { TopNav } from "@/components/shared/top-nav";
import { LevelBadge } from "@/components/shared/level-badge";
import { AchievementIcon } from "@/components/shared/achievement-icon";
import { Button } from "@/components/ui/button";
import { Users, Star } from "lucide-react";
import type { LevelKey } from "@/lib/levels";

interface ProfileData {
  name: string;
  telegramUsername: string | null;
  level: LevelKey | null;
  levelLocked: boolean;
  stats: {
    totalPoints: number;
    globalRank: number;
    accuracy: number;
    challengesCompleted: number;
    dayStreak: number;
  };
  achievements: { key: string; title: string; icon: string | null }[];
  referral: { code: string; friendsInvited: number; referralPoints: number };
}

export default function ProfilePage() {
  const [data, setData] = useState<ProfileData | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) {
    return (
      <main className="min-h-screen bg-[var(--bg)]">
        <TopNav />
        <div className="mx-auto max-w-3xl px-5 py-10 animate-pulse space-y-4">
          <div className="h-24 border-2 border-[var(--line)] bg-black/5" />
          <div className="h-40 border-2 border-[var(--line)] bg-black/5" />
        </div>
      </main>
    );
  }

  const referralLink =
    typeof window !== "undefined" ? `${window.location.origin}/join/${data.referral.code}` : "";

  function copyLink() {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <TopNav userName={data.name} level={data.level} />
      <div className="mx-auto max-w-3xl px-5 py-10">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="w-16 h-16 border-2 border-[var(--line)] bg-[var(--ink)] text-[var(--bg)] grid place-items-center font-[family-name:var(--font-display)] text-2xl">
            {data.name[0]?.toUpperCase()}
          </div>
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-2xl uppercase">{data.name}</h1>
            {data.telegramUsername && (
              <p className="font-[family-name:var(--font-mono)] text-[var(--muted)] text-sm">@{data.telegramUsername}</p>
            )}
          </div>
          <div className="ml-auto">
            <LevelBadge level={data.level} locked={data.levelLocked} size="lg" />
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 sm:grid-cols-5 border-2 border-[var(--line)] divide-x-2 sm:divide-y-0 divide-y-2 sm:divide-x-2 divide-[var(--line)]">
          <Stat label="Total Points" value={data.stats.totalPoints} />
          <Stat label="Global Rank" value={`#${data.stats.globalRank}`} />
          <Stat label="Accuracy" value={`${data.stats.accuracy}%`} />
          <Stat label="Challenges" value={data.stats.challengesCompleted} />
          <Stat label="Day Streak" value={`${data.stats.dayStreak}🔥`} />
        </div>

        <h2 className="mt-10 font-[family-name:var(--font-mono)] text-xs font-bold uppercase tracking-[0.3em] text-[var(--muted)]">
          Achievements
        </h2>
        {data.achievements.length === 0 ? (
          <div className="mt-4 border-2 border-[var(--line)] p-6 text-center text-[var(--muted)] font-[family-name:var(--font-mono)] text-sm">
            No achievements yet — complete your first challenge to unlock one.
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 border-2 border-[var(--line)] divide-x-2 divide-y-2 divide-[var(--line)]">
            {data.achievements.map((a) => (
              <div key={a.key} className="p-4 text-center bg-[var(--paper)]">
                <AchievementIcon achievementKey={a.key} size={26} className="mx-auto text-[var(--blue)]" />
                <p className="mt-2 text-sm font-semibold">{a.title}</p>
              </div>
            ))}
          </div>
        )}

        <h2 className="mt-10 font-[family-name:var(--font-mono)] text-xs font-bold uppercase tracking-[0.3em] text-[var(--muted)]">
          Referrals
        </h2>
        <div className="mt-4 border-2 border-[var(--line)] p-6">
          <div className="flex gap-10 font-[family-name:var(--font-mono)]">
            <div>
              <p className="text-2xl font-bold flex items-center gap-2">
                <Users size={20} strokeWidth={2.5} className="text-[var(--blue)]" />
                {data.referral.friendsInvited}
              </p>
              <p className="text-xs text-[var(--muted)] uppercase tracking-wide mt-1">Friends Invited</p>
            </div>
            <div>
              <p className="text-2xl font-bold flex items-center gap-2">
                <Star size={20} strokeWidth={2.5} className="text-[var(--yellow)]" fill="currentColor" />
                {data.referral.referralPoints}
              </p>
              <p className="text-xs text-[var(--muted)] uppercase tracking-wide mt-1">Referral Points</p>
            </div>
          </div>
          <Button className="mt-6 w-full" onClick={copyLink}>
            {copied ? "Link copied!" : "Invite friends →"}
          </Button>
        </div>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="p-4 text-center bg-[var(--paper)]">
      <p className="text-xl font-bold font-[family-name:var(--font-mono)]">{value}</p>
      <p className="text-xs text-[var(--muted)] mt-1 uppercase tracking-wide">{label}</p>
    </div>
  );
}
