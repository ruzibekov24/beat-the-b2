"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";

interface Settings {
  startDate: string | null;
  endDate: string | null;
  dailyStartTime: string | null;
  multiplierA1A2: number;
  multiplierB1: number;
  multiplierB2: number;
  multiplierC1: number;
  referralPoints: number;
  maxAttemptsDefault: number;
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings").then((r) => r.json()).then((d) => setSettings(d.settings));
  }, []);

  async function save() {
    if (!settings) return;
    setSaving(true);
    await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (!settings) {
    return (
      <AdminShell>
        <div className="p-8 text-white/50">Loading…</div>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <div className="p-8 max-w-xl">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold">Competition Settings</h1>
        <p className="mt-1 text-sm text-white/50">
          These values drive scoring and scheduling everywhere in the app — nothing is hardcoded on the frontend.
        </p>
        <p className="mt-2 text-xs text-white/40">
          Day 1 opens at the start date. Days 2–7 each open at the daily start time.
        </p>

        <div className="mt-6 space-y-4">
          <Row label="Start date">
            <input
              type="datetime-local"
              value={toLocalInput(settings.startDate)}
              onChange={(e) =>
                setSettings({ ...settings, startDate: e.target.value ? new Date(e.target.value).toISOString() : null })
              }
              className="border-2 border border-white/30 bg-black px-3 py-2 text-sm"
            />
          </Row>
          <Row label="Daily start (days 2–7)">
            <input
              type="time"
              value={toLocalTimeInput(settings.dailyStartTime)}
              onChange={(e) =>
                setSettings({ ...settings, dailyStartTime: fromLocalTimeInput(e.target.value) })
              }
              className="border-2 border border-white/30 bg-black px-3 py-2 text-sm"
            />
          </Row>
          <Row label="End date">
            <input
              type="datetime-local"
              value={toLocalInput(settings.endDate)}
              onChange={(e) =>
                setSettings({ ...settings, endDate: e.target.value ? new Date(e.target.value).toISOString() : null })
              }
              className="border-2 border border-white/30 bg-black px-3 py-2 text-sm"
            />
          </Row>
          <Row label="A1–A2 multiplier">
            <NumInput value={settings.multiplierA1A2} onChange={(v) => setSettings({ ...settings, multiplierA1A2: v })} />
          </Row>
          <Row label="B1 multiplier">
            <NumInput value={settings.multiplierB1} onChange={(v) => setSettings({ ...settings, multiplierB1: v })} />
          </Row>
          <Row label="B2 multiplier">
            <NumInput value={settings.multiplierB2} onChange={(v) => setSettings({ ...settings, multiplierB2: v })} />
          </Row>
          <Row label="C1 multiplier">
            <NumInput value={settings.multiplierC1} onChange={(v) => setSettings({ ...settings, multiplierC1: v })} />
          </Row>
          <Row label="Referral points">
            <NumInput
              value={settings.referralPoints}
              onChange={(v) => setSettings({ ...settings, referralPoints: v })}
              step={1}
            />
          </Row>
          <Row label="Default max attempts">
            <NumInput
              value={settings.maxAttemptsDefault}
              onChange={(v) => setSettings({ ...settings, maxAttemptsDefault: v })}
              step={1}
            />
          </Row>
        </div>

        <Button className="mt-6" onClick={save} disabled={saving}>
          {saving ? "Saving…" : saved ? "Saved ✓" : "Save settings"}
        </Button>
      </div>
    </AdminShell>
  );
}

/**
 * `datetime-local` inputs speak local wall-clock time, but the API stores UTC
 * ISO strings — rendering the raw ISO would show (and then re-save) the value
 * shifted by the browser's UTC offset.
 */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

/** Renders a stored UTC instant as the local `HH:MM` a `time` input expects. */
function toLocalTimeInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/**
 * Turns a local `HH:MM` back into a full ISO instant. Only the time-of-day is
 * ever read server-side, so the date part is an arbitrary anchor.
 */
function fromLocalTimeInput(value: string): string | null {
  if (!value) return null;
  const [h, m] = value.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <label className="text-sm text-white/70">{label}</label>
      {children}
    </div>
  );
}

function NumInput({ value, onChange, step = 0.05 }: { value: number; onChange: (v: number) => void; step?: number }) {
  return (
    <input
      type="number"
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-28 border-2 border border-white/30 bg-black px-3 py-2 text-sm"
    />
  );
}
