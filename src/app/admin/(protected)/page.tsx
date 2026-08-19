"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { LEVELS } from "@/lib/levels";

interface Stats {
  totalUsers: number;
  lockedUsers: number;
  totalAttempts: number;
  totalChallenges: number;
  publishedChallenges: number;
  totalReferrals: number;
  levelCounts: { level: keyof typeof LEVELS | null; _count: number }[];
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);

  useEffect(() => {
    fetch("/api/admin/stats").then(async (r) => {
      if (r.status === 401) {
        setUnauthorized(true);
        window.location.href = "/admin/login";
        return;
      }
      setStats(await r.json());
    });
  }, []);

  if (unauthorized) return null;
  if (!stats) return <AdminShell><div className="p-8 text-white/40">Loading…</div></AdminShell>;

  return (
    <AdminShell>
      <div className="p-8">
        <h1 className="font-[family-name:var(--font-display)] text-2xl uppercase">Dashboard</h1>
        <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 border-2 border-white/20 divide-x-2 divide-y-2 sm:divide-y-0 divide-white/20">
          <StatCard label="Total Users" value={stats.totalUsers} />
          <StatCard label="Level Locked" value={stats.lockedUsers} />
          <StatCard label="Attempts Submitted" value={stats.totalAttempts} />
          <StatCard label="Published" value={`${stats.publishedChallenges}/${stats.totalChallenges}`} />
        </div>

        <h2 className="mt-10 text-xs font-bold uppercase tracking-[0.3em] text-white/40">Users by level</h2>
        <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 border-2 border-white/20 divide-x-2 divide-y-2 sm:divide-y-0 divide-white/20">
          {stats.levelCounts.map((row) => {
            const l = row.level ? LEVELS[row.level] : null;
            return (
              <div key={row.level ?? "none"} className="p-5">
                <p className="text-sm text-white/50">{l ? l.label : "No level"}</p>
                <p className="mt-2 text-2xl font-bold" style={{ color: l?.hex }}>{row._count}</p>
              </div>
            );
          })}
        </div>
      </div>
    </AdminShell>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="p-5">
      <p className="text-sm text-white/50">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}
