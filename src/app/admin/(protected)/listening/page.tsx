"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { LEVELS, type LevelKey } from "@/lib/levels";

interface ListeningMaterial {
  id: string;
  title: string;
  audioUrl: string;
  level: LevelKey;
  durationSec: number | null;
  isPublished: boolean;
  isDemo: boolean;
}

export default function AdminListeningPage() {
  const [items, setItems] = useState<ListeningMaterial[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  function load() {
    fetch("/api/admin/listening").then((r) => r.json()).then((d) => {
      setItems(d.materials ?? []);
      setLoading(false);
    });
  }
  useEffect(load, []);

  async function togglePublish(item: ListeningMaterial) {
    await fetch(`/api/admin/listening/${item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublished: !item.isPublished }),
    });
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this listening material?")) return;
    await fetch(`/api/admin/listening/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <AdminShell>
      <div className="p-8">
        <div className="flex items-center justify-between">
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold">Listening</h1>
          <Button size="sm" onClick={() => setShowForm(true)}>+ ADD LISTENING</Button>
        </div>

        <div className="mt-6 grid gap-4">
          {loading ? (
            <p className="text-white/40">Loading…</p>
          ) : items.length === 0 ? (
            <p className="text-white/40">No listening materials yet. Admin-provided audio only.</p>
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
                      <audio controls src={item.audioUrl} className="mt-3 h-8 w-64" />
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
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {showForm && <ListeningForm onClose={() => setShowForm(false)} onSaved={load} />}
    </AdminShell>
  );
}

function ListeningForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState("");
  const [level, setLevel] = useState<LevelKey>("B2");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!title.trim() || !file) {
      setError("Title and an audio file are required.");
      return;
    }
    setSaving(true);
    setError(null);
    const form = new FormData();
    form.append("title", title);
    form.append("level", level);
    form.append("isPublished", "false");
    form.append("audio", file);

    const res = await fetch("/api/admin/listening", { method: "POST", body: form });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Could not upload audio.");
      return;
    }
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 grid place-items-center z-50 px-5">
      <div className="bg-black border border-white/20 border-2 p-6 max-w-md w-full">
        <h2 className="font-bold text-lg">Add Listening</h2>
        <div className="mt-4 space-y-3">
          <input
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border-2 border border-white/30 bg-black px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value as LevelKey)}
            className="w-full border-2 border border-white/30 bg-black px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          >
            {Object.values(LEVELS).map((l) => (
              <option key={l.key} value={l.key}>{l.label}</option>
            ))}
          </select>
          <input
            type="file"
            accept="audio/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full text-sm text-white/50"
          />
        </div>
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        <div className="mt-5 flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" onClick={save} disabled={saving}>{saving ? "Uploading…" : "Save"}</Button>
        </div>
      </div>
    </div>
  );
}
