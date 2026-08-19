"use client";

import { useEffect, useState } from "react";
import { TopNav } from "@/components/shared/top-nav";
import { LEVELS, LEVEL_ORDER, type LevelKey } from "@/lib/levels";
import { cn } from "@/lib/utils";
import { Trophy, Medal, Award } from "lucide-react";

interface Row {
  rank: number;
  id: string;
  name: string;
  telegramUsername: string | null;
  photoUrl: string | null;
  level: LevelKey | null;
  totalPoints: number;
}

export default function LeaderboardPage() {
  const [filter, setFilter] = useState<LevelKey | "GLOBAL">("GLOBAL");
  const [rows, setRows] = useState<Row[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const qs = filter === "GLOBAL" ? "" : `?level=${filter}`;
    fetch(`/api/leaderboard${qs}`)
      .then((r) => r.json())
      .then((data) => {
        setRows(data.rows);
        setCurrentUserId(data.currentUserId ?? null);
        setLoading(false);
      });
  }, [filter]);

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <TopNav />
      <div className="mx-auto max-w-3xl px-5 py-10">
        <h1 className="font-[family-name:var(--font-display)] text-4xl uppercase">Leaderboard</h1>

        <div className="mt-6 flex gap-2 overflow-x-auto pb-1 font-[family-name:var(--font-mono)] text-xs font-bold uppercase">
          <FilterPill active={filter === "GLOBAL"} onClick={() => setFilter("GLOBAL")}>Global</FilterPill>
          {LEVEL_ORDER.map((key) => (
            <FilterPill key={key} active={filter === key} onClick={() => setFilter(key)}>
              {LEVELS[key].label}
            </FilterPill>
          ))}
        </div>

        <div className="mt-6 border-2 border-[var(--line)] divide-y-2 divide-[var(--line)]">
          {loading ? (
            <div className="p-8 text-center text-[var(--muted)] font-[family-name:var(--font-mono)]">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center text-[var(--muted)] font-[family-name:var(--font-mono)]">
              No competitors here yet. Be the first.
            </div>
          ) : (
            rows.map((row) => {
              const l = row.level ? LEVELS[row.level] : null;
              const isMe = row.id === currentUserId;
              return (
                <div
                  key={row.id}
                  className={cn(
                    "flex items-center gap-4 px-5 py-4 font-[family-name:var(--font-mono)]",
                    isMe && "bg-[var(--yellow)]"
                  )}
                >
                  <span className="w-10 flex items-center justify-center font-bold text-lg tabular-nums">
                    {row.rank === 1 ? (
                      <Trophy size={20} strokeWidth={2.5} className="text-[#D4A017]" fill="#FFD84D" />
                    ) : row.rank === 2 ? (
                      <Medal size={20} strokeWidth={2.5} className="text-[#8A8D91]" fill="#C7CBD1" />
                    ) : row.rank === 3 ? (
                      <Award size={20} strokeWidth={2.5} className="text-[#A15C2B]" fill="#D08A52" />
                    ) : (
                      `#${row.rank}`
                    )}
                  </span>
                  <div className="w-9 h-9 border-2 border-current grid place-items-center font-bold text-sm shrink-0">
                    {row.name[0]?.toUpperCase()}
                  </div>
                  <span className="flex-1 font-semibold truncate">
                    {row.name} {isMe && <span className="text-xs">(you)</span>}
                  </span>
                  {l && (
                    <span className="text-xs font-bold px-2 py-1 border-2 border-current" style={{ color: isMe ? "black" : l.hex }}>
                      {l.label}
                    </span>
                  )}
                  <span className="font-bold tabular-nums w-20 text-right">{row.totalPoints} XP</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-4 py-2 border-2 border-[var(--line)] whitespace-nowrap transition-colors",
        active ? "bg-[var(--yellow)] text-black" : "bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)]"
      )}
    >
      {children}
    </button>
  );
}
