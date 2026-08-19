"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { LEVELS, type LevelKey } from "@/lib/levels";

interface Row {
  rank: number;
  id: string;
  name: string;
  telegramUsername: string | null;
  level: LevelKey | null;
  totalPoints: number;
}

export default function AdminLeaderboardPage() {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    fetch("/api/leaderboard").then((r) => r.json()).then((d) => setRows(d.rows ?? []));
  }, []);

  return (
    <AdminShell>
      <div className="p-8">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold">Leaderboard</h1>
        <div className="mt-6 border-2 border border-white/20 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-black text-white/50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Rank</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Level</th>
                <th className="px-4 py-3 font-medium">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/20">
              {rows.map((r) => {
                const l = r.level ? LEVELS[r.level] : null;
                return (
                  <tr key={r.id} className="hover:bg-black/50">
                    <td className="px-4 py-3 font-semibold">#{r.rank}</td>
                    <td className="px-4 py-3">{r.name} <span className="text-white/40">@{r.telegramUsername}</span></td>
                    <td className="px-4 py-3">
                      {l && (
                        <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2 py-1 border-2 ${l.bgSoft} ${l.textClass}`}>
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: l.hex }} />
                          {l.label}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold">{r.totalPoints}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}
