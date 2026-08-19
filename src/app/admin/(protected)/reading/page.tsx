"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { LEVELS, type LevelKey } from "@/lib/levels";

interface ReadingMaterial {
  id: string;
  title: string;
  content: string;
  level: LevelKey;
  isPublished: boolean;
  isDemo: boolean;
  challenge: { id: string } | null;
}

export default function AdminReadingPage() {
  const router = useRouter();
  const [items, setItems] = useState<ReadingMaterial[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  function load() {
    fetch("/api/admin/reading").then((r) => r.json()).then((d) => {
      setItems(d.materials ?? []);
      setLoading(false);
    });
  }
  useEffect(load, []);

  async function togglePublish(item: ReadingMaterial) {
    await fetch(`/api/admin/reading/${item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublished: !item.isPublished }),
    });
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this reading material?")) return;
    await fetch(`/api/admin/reading/${id}`, { method: "DELETE" });
    load();
  }

  async function goToQuestions(item: ReadingMaterial, day: number) {
    if (item.challenge) {
      router.push(`/admin/challenges/${item.challenge.id}`);
      return;
    }
    const res = await fetch(`/api/admin/reading/${item.id}/challenge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ day }),
    });
    const d = await res.json();
    if (d.challengeId) router.push(`/admin/challenges/${d.challengeId}`);
  }

  return (
    <AdminShell>
      <div className="p-8">
        <div className="flex items-center justify-between">
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold">Reading</h1>
          <Button size="sm" onClick={() => setShowForm(true)}>+ ADD READING</Button>
        </div>

        <div className="mt-6 grid gap-4">
          {loading ? (
            <p className="text-white/40">Loading…</p>
          ) : items.length === 0 ? (
            <p className="text-white/40">No reading materials yet. Admin-provided content only — nothing is auto-sourced.</p>
          ) : (
            items.map((item) => {
              const l = LEVELS[item.level];
              return (
                <div key={item.id} className="border-2 border border-white/20 bg-black p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold">
                        {item.title} {item.isDemo && <span className="text-xs text-amber-400 ml-1">(demo)</span>}
                      </p>
                      <span className={`inline-block mt-1 text-xs font-bold px-2 py-0.5 border-2 ${l.bgSoft} ${l.textClass}`}>
                        <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: l.hex }} />{l.label}</span>
                      </span>
                      <p className="mt-2 text-sm text-white/50 line-clamp-2">{item.content}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className={`text-xs font-bold px-2 py-1 border-2 ${item.isPublished ? "bg-emerald-500/10 text-emerald-400" : "bg-white/10 text-white/70"}`}>
                        {item.isPublished ? "published" : "draft"}
                      </span>
                      <div className="space-x-2">
                        <button onClick={() => togglePublish(item)} className="text-blue-400 hover:underline text-xs font-semibold">
                          {item.isPublished ? "Unpublish" : "Publish"}
                        </button>
                        <button onClick={() => remove(item.id)} className="text-red-400 hover:underline text-xs font-semibold">
                          Delete
                        </button>
                      </div>
                      <QuestionsAction item={item} onGo={goToQuestions} />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {showForm && <ReadingForm onClose={() => setShowForm(false)} onSaved={load} />}
    </AdminShell>
  );
}

function QuestionsAction({
  item,
  onGo,
}: {
  item: ReadingMaterial;
  onGo: (item: ReadingMaterial, day: number) => void;
}) {
  const [day, setDay] = useState(1);

  if (item.challenge) {
    return (
      <button onClick={() => onGo(item, day)} className="text-emerald-400 hover:underline text-xs font-semibold">
        Manage questions →
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] text-white/40">Day</span>
      <input
        type="number"
        min={1}
        max={7}
        value={day}
        onChange={(e) => setDay(Number(e.target.value))}
        className="w-12 border border-white/30 bg-black px-1.5 py-1 text-xs outline-none"
      />
      <button onClick={() => onGo(item, day)} className="text-emerald-400 hover:underline text-xs font-semibold whitespace-nowrap">
        + Add questions →
      </button>
    </div>
  );
}

function ReadingForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [level, setLevel] = useState<LevelKey>("B2");
  const [day, setDay] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(thenAddQuestions: boolean) {
    if (!title.trim() || !content.trim()) {
      setError("Title and content are required.");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch("/api/admin/reading", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content, level, isPublished: false }),
    });
    if (!res.ok) {
      setSaving(false);
      setError("Could not save reading material.");
      return;
    }
    const { material } = await res.json();

    if (thenAddQuestions) {
      const chRes = await fetch(`/api/admin/reading/${material.id}/challenge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ day }),
      });
      const d = await chRes.json();
      setSaving(false);
      onSaved();
      if (d.challengeId) router.push(`/admin/challenges/${d.challengeId}`);
      return;
    }

    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 grid place-items-center z-50 px-5">
      <div className="bg-black border border-white/20 border-2 p-6 max-w-lg w-full">
        <h2 className="font-bold text-lg">Add Reading</h2>
        <div className="mt-4 space-y-3">
          <input
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border-2 border border-white/30 bg-black px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-3">
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value as LevelKey)}
              className="flex-1 border-2 border border-white/30 bg-black px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.values(LEVELS).map((l) => (
                <option key={l.key} value={l.key}>{l.label}</option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/50 whitespace-nowrap">Day</span>
              <input
                type="number"
                min={1}
                max={7}
                value={day}
                onChange={(e) => setDay(Number(e.target.value))}
                className="w-16 border-2 border border-white/30 bg-black px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <textarea
            placeholder="Reading passage content…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={8}
            className="w-full border-2 border border-white/30 bg-black px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        <div className="mt-5 flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" onClick={() => save(false)} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </div>
        <button
          onClick={() => save(true)}
          disabled={saving}
          className="mt-3 w-full text-center text-xs text-emerald-400 hover:underline font-semibold"
        >
          Save & add questions now →
        </button>
      </div>
    </div>
  );
}
