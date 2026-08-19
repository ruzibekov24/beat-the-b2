"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LEVELS, LEVEL_ORDER, type LevelKey } from "@/lib/levels";
import { cn } from "@/lib/utils";
import { AlertTriangle, Siren, Skull, Lock, PartyPopper } from "lucide-react";

type Stage = "pick" | "confirm1" | "confirm2" | "locked";

export default function LevelSelectionPage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("pick");
  const [selected, setSelected] = useState<LevelKey | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick(level: LevelKey) {
    setError(null);
    const res = await fetch("/api/level/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ level }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not select level.");
      return;
    }
    setSelected(level);
    setStage("confirm1");
  }

  async function lockLevel() {
    if (!selected) return;
    setLoading(true);
    setError(null);
    const res = await fetch("/api/level/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ level: selected }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not lock level.");
      return;
    }
    setStage("locked");
  }

  if (stage === "pick") return <PickStage selected={selected} onPick={pick} error={error} />;
  if (stage === "confirm1" && selected)
    return <ConfirmStage1 level={selected} onBack={() => setStage("pick")} onConfirm={() => setStage("confirm2")} />;
  if (stage === "confirm2" && selected)
    return (
      <ConfirmStage2
        level={selected}
        loading={loading}
        error={error}
        onBack={() => setStage("confirm1")}
        onLock={lockLevel}
      />
    );
  if (stage === "locked" && selected)
    return <LockedStage level={selected} onContinue={() => router.push("/home")} />;

  return null;
}

function PickStage({
  selected,
  onPick,
  error,
}: {
  selected: LevelKey | null;
  onPick: (l: LevelKey) => void;
  error: string | null;
}) {
  return (
    <Shell step="Step 2 of 3" title="Choose your level" subtitle="Higher levels give more points but harder challenges.">
      <div className="mt-8 grid sm:grid-cols-2 border-2 border-[var(--line)] divide-y-2 sm:divide-y-0 sm:divide-x-2 divide-[var(--line)]">
        {LEVEL_ORDER.map((key) => {
          const l = LEVELS[key];
          return (
            <button
              key={key}
              onClick={() => onPick(key)}
              className={cn(
                "text-left p-6 transition-all bg-[var(--paper)] hover:bg-[var(--yellow)] hover:text-black group",
                selected === key && "bg-[var(--yellow)] text-black"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-widest text-[var(--muted)] group-hover:text-black/60">
                  {l.subtitle}
                </span>
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: l.hex }} />
              </div>
              <p className="mt-3 font-[family-name:var(--font-display)] text-4xl">{l.label}</p>
              <p className="mt-3 font-[family-name:var(--font-mono)] text-xl font-bold">{l.multiplierLabel}</p>
            </button>
          );
        })}
      </div>
      {error && <p className="mt-4 font-[family-name:var(--font-mono)] text-sm text-[var(--red)]">{error}</p>}
    </Shell>
  );
}

function ConfirmStage1({
  level,
  onBack,
  onConfirm,
}: {
  level: LevelKey;
  onBack: () => void;
  onConfirm: () => void;
}) {
  const l = LEVELS[level];
  return (
    <Shell
      step="Are you sure?"
      title="ARE YOU SURE?"
      subtitle=""
      icon={<AlertTriangle size={36} strokeWidth={2.5} className="text-[var(--yellow)]" />}
    >
      <Card className="mt-6 p-7">
        <p className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-widest text-[var(--muted)]">
          You selected:
        </p>
        <p className="mt-2 font-[family-name:var(--font-display)] text-3xl" style={{ color: l.hex }}>
          {l.label} — {l.subtitle}
        </p>
        <p className="mt-5 text-[var(--muted)]">
          Your level cannot be changed after confirmation. The higher the level, the harder the
          challenges.
        </p>
        <p className="mt-4 font-bold">Are you sure you want {l.label}?</p>
      </Card>
      <div className="mt-6 grid grid-cols-2 gap-4">
        <Button variant="secondary" onClick={onBack}>Go back</Button>
        <Button onClick={onConfirm}>Yes, I&apos;m sure</Button>
      </div>
    </Shell>
  );
}

function ConfirmStage2({
  level,
  loading,
  error,
  onBack,
  onLock,
}: {
  level: LevelKey;
  loading: boolean;
  error: string | null;
  onBack: () => void;
  onLock: () => void;
}) {
  const l = LEVELS[level];
  const isC1 = level === "C1";
  return (
    <Shell
      step="Last chance"
      title={isC1 ? "BRO... REALLY?" : "REALLY?"}
      subtitle=""
      icon={
        isC1 ? (
          <Skull size={36} strokeWidth={2.5} className="text-[var(--purple)]" />
        ) : (
          <Siren size={36} strokeWidth={2.5} className="text-[var(--red)]" />
        )
      }
    >
      <Card className="mt-6 p-7 bg-[var(--red)] text-white border-[var(--line)]">
        <p>
          {isC1 ? "You're choosing C1 — ALMOST IMPOSSIBLE?" : `You're really choosing ${l.label}?`}
        </p>
        <p className="mt-3">
          Once you continue, there is <strong>NO going back</strong>.
        </p>
        <p className="mt-5 font-[family-name:var(--font-mono)] text-xs uppercase tracking-widest text-white/70">
          Your selected level:
        </p>
        <p className="mt-1 font-[family-name:var(--font-display)] text-3xl">
          {l.label} — {l.multiplierLabel}
        </p>
        {isC1 && (
          <p className="mt-3 text-sm text-white/90">
            You will receive ×2 points, but the challenges will be significantly harder.
          </p>
        )}
        <p className="mt-5 font-bold uppercase">Are you ready to lock this level?</p>
      </Card>
      {error && <p className="mt-3 font-[family-name:var(--font-mono)] text-sm text-[var(--red)]">{error}</p>}
      <div className="mt-6 grid grid-cols-2 gap-4">
        <Button variant="secondary" onClick={onBack} disabled={loading}>
          No, let me think
        </Button>
        <Button onClick={onLock} disabled={loading}>
          {loading ? (
            "Locking…"
          ) : (
            <>
              <Lock size={15} strokeWidth={2.5} />
              Lock {l.label}
            </>
          )}
        </Button>
      </div>
    </Shell>
  );
}

function LockedStage({ level, onContinue }: { level: LevelKey; onContinue: () => void }) {
  const l = LEVELS[level];
  return (
    <Shell
      step="Locked"
      title="LEVEL LOCKED"
      subtitle=""
      icon={<Lock size={32} strokeWidth={2.5} className="text-[var(--green)]" />}
    >
      <Card className="mt-6 p-9 text-center relative overflow-hidden" style={{ backgroundColor: l.hex }}>
        <div className="absolute inset-0 dot-grid" aria-hidden />
        <p className="relative text-white/80 font-[family-name:var(--font-mono)] text-xs uppercase tracking-widest">
          You chose
        </p>
        <p className="relative mt-2 font-[family-name:var(--font-display)] text-4xl text-white">
          {l.label} — {l.subtitle}
        </p>
        <p className="relative mt-4 text-white/90">This level cannot be changed during the competition.</p>
        <p className="relative mt-4 font-bold text-white">Good luck. You&apos;re going to need it.</p>
      </Card>
      <Button className="w-full mt-6" size="lg" onClick={onContinue}>
        Enter the competition →
      </Button>
    </Shell>
  );
}

function Shell({
  step,
  title,
  subtitle,
  icon,
  children,
}: {
  step: string;
  title: string;
  subtitle: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[var(--bg)] px-5 py-16">
      <div className="mx-auto max-w-2xl">
        <p className="font-[family-name:var(--font-mono)] text-xs font-bold text-[var(--blue)] uppercase tracking-widest">
          {step}
        </p>
        <h1 className="mt-2 flex items-center gap-3 font-[family-name:var(--font-display)] text-4xl sm:text-5xl uppercase leading-none">
          {icon}
          {title}
        </h1>
        {subtitle && <p className="mt-2 text-[var(--muted)]">{subtitle}</p>}
        {children}
      </div>
    </main>
  );
}
