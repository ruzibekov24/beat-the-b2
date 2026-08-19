"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { LEVELS, type LevelKey } from "@/lib/levels";
import { Lock } from "lucide-react";

interface AdminUser {
  id: string;
  name: string;
  telegramUsername: string | null;
  telegramId: string;
  level: LevelKey | null;
  levelLockedAt: string | null;
  totalPoints: number;
  dayStreak: number;
  _count: { attempts: number; referrals: number };
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => {
      fetch(`/api/admin/users${q ? `?q=${encodeURIComponent(q)}` : ""}`)
        .then((r) => r.json())
        .then((d) => {
          setUsers(d.users ?? []);
          setLoading(false);
        });
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <AdminShell>
      <div className="p-8">
        <div className="flex items-center justify-between">
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold">Users</h1>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or username…"
            className="border-2 border border-white/30 bg-black px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 w-72"
          />
        </div>

        <div className="mt-6 border-2 border border-white/20 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-black text-white/50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Telegram</th>
                <th className="px-4 py-3 font-medium">Level</th>
                <th className="px-4 py-3 font-medium">Points</th>
                <th className="px-4 py-3 font-medium">Attempts</th>
                <th className="px-4 py-3 font-medium">Referrals</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/20">
              {loading ? (
                <tr><td className="px-4 py-6 text-white/40" colSpan={6}>Loading…</td></tr>
              ) : users.length === 0 ? (
                <tr><td className="px-4 py-6 text-white/40" colSpan={6}>No users found.</td></tr>
              ) : (
                users.map((u) => {
                  const l = u.level ? LEVELS[u.level] : null;
                  return (
                    <tr key={u.id} className="hover:bg-black/50">
                      <td className="px-4 py-3 font-medium">{u.name}</td>
                      <td className="px-4 py-3 text-white/50">@{u.telegramUsername ?? "—"}</td>
                      <td className="px-4 py-3">
                        {l ? (
                          <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2 py-1 border-2 ${l.bgSoft} ${l.textClass}`}>
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: l.hex }} />
                            {l.label} {u.levelLockedAt && <Lock size={11} strokeWidth={2.5} />}
                          </span>
                        ) : (
                          <span className="text-white/40">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-semibold">{u.totalPoints}</td>
                      <td className="px-4 py-3 text-white/50">{u._count.attempts}</td>
                      <td className="px-4 py-3 text-white/50">{u._count.referrals}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}
