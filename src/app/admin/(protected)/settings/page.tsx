"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";

interface Settings {
  startDate: string | null;
  endDate: string | null;
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

        <div className="mt-6 space-y-4">
          <Row label="Start date">
            <input
              type="datetime-local"
              value={settings.startDate?.slice(0, 16) ?? ""}
              onChange={(e) =>
                setSettings({ ...settings, startDate: e.target.value ? new Date(e.target.value).toISOString() : null })
              }
              className="border-2 border border-white/30 bg-black px-3 py-2 text-sm"
            />
          </Row>
          <Row label="End date">
            <input
              type="datetime-local"
              value={settings.endDate?.slice(0, 16) ?? ""}
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
