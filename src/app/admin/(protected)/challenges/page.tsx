"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { LEVELS, type LevelKey } from "@/lib/levels";
import { cn } from "@/lib/utils";

interface Challenge {
  id: string;
  day: number;
  title: string;
  type: string;
  level: LevelKey | null;
  status: "draft" | "scheduled" | "published" | "archived";
  basePoints: number;
  _count: { questions: number; attempts: number };
}

const CHALLENGE_TYPES = ["quiz", "ai_battle", "listening", "reading", "vocabulary", "grammar", "speed", "final"];

export default function AdminChallengesPage() {
  const router = useRouter();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  function load() {
    fetch("/api/admin/challenges")
      .then((r) => r.json())
      .then((d) => {
        setChallenges(d.challenges ?? []);
        setLoading(false);
      });
  }

  useEffect(load, []);

  async function togglePublish(c: Challenge) {
    const nextStatus = c.status === "published" ? "draft" : "published";
    await fetch(`/api/admin/challenges/${c.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this challenge and all its questions?")) return;
    await fetch(`/api/admin/challenges/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <AdminShell>
      <div className="p-8">
        <div className="flex items-center justify-between">
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold">Challenges</h1>
          <Button size="sm" onClick={() => setShowCreate(true)}>+ ADD CHALLENGE</Button>
        </div>

        <div className="mt-6 border-2 border border-white/20 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-black text-white/50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Day</th>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Level</th>
                <th className="px-4 py-3 font-medium">Questions</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/20">
              {loading ? (
                <tr><td className="px-4 py-6 text-white/40" colSpan={7}>Loading…</td></tr>
              ) : challenges.length === 0 ? (
                <tr><td className="px-4 py-6 text-white/40" colSpan={7}>No challenges yet.</td></tr>
              ) : (
                challenges.map((c) => {
                  const l = c.level ? LEVELS[c.level] : null;
                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-black/50 cursor-pointer"
                      onClick={() => router.push(`/admin/challenges/${c.id}`)}
                    >
                      <td className="px-4 py-3 font-semibold">Day {c.day}</td>
                      <td className="px-4 py-3">{c.title}</td>
                      <td className="px-4 py-3 text-white/50">{c.type}</td>
                      <td className="px-4 py-3">
                        {l ? (
                          <span className={`text-xs font-bold px-2 py-1 border-2 ${l.bgSoft} ${l.textClass}`}>
                            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: l.hex }} />{l.label}</span>
                          </span>
                        ) : (
                          <span className="text-white/40">All levels</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-white/50">{c._count.questions}</td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "text-xs font-bold px-2 py-1 border-2",
                            c.status === "published"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-white/10 text-white/70"
                          )}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => togglePublish(c)} className="text-blue-400 hover:underline text-xs font-semibold">
                          {c.status === "published" ? "Unpublish" : "Publish"}
                        </button>
                        <button onClick={() => remove(c.id)} className="text-red-400 hover:underline text-xs font-semibold">
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && <CreateChallengeModal onClose={() => setShowCreate(false)} onCreated={load} />}
    </AdminShell>
  );
}

function CreateChallengeModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [day, setDay] = useState(1);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("quiz");
  const [level, setLevel] = useState<LevelKey | "">("");
  const [basePoints, setBasePoints] = useState(10);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch("/api/admin/challenges", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ day, title, type, level: level || null, basePoints }),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Could not create challenge.");
      return;
    }
    onCreated();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 grid place-items-center z-50 px-5">
      <div className="bg-black border border-white/20 border-2 p-6 max-w-md w-full">
        <h2 className="font-bold text-lg">Add Challenge</h2>

        <div className="mt-4 space-y-3">
          <Field label="Day (1–7)">
            <input
              type="number"
              min={1}
              max={7}
              value={day}
              onChange={(e) => setDay(Number(e.target.value))}
              className="w-full border-2 border border-white/30 bg-black px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </Field>
          <Field label="Title">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border-2 border border-white/30 bg-black px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </Field>
          <Field label="Type">
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full border-2 border border-white/30 bg-black px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            >
              {CHALLENGE_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Level (blank = all levels)">
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value as LevelKey | "")}
              className="w-full border-2 border border-white/30 bg-black px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All levels</option>
              {Object.values(LEVELS).map((l) => (
                <option key={l.key} value={l.key}>{l.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Base points per question">
            <input
              type="number"
              min={1}
              value={basePoints}
              onChange={(e) => setBasePoints(Number(e.target.value))}
              className="w-full border-2 border border-white/30 bg-black px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </Field>
        </div>

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

        <p className="mt-3 text-xs text-white/40">
          After creating, click the challenge row to add questions (paste JSON generated by
          Claude, or import manually).
        </p>

        <div className="mt-5 flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Create draft"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-semibold text-white/50">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
