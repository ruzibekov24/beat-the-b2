"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Maximize, Minimize, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Option {
  id: string;
  label: string;
  text: string;
}
interface Question {
  id: string;
  order: number;
  type: string;
  prompt: string;
  options: Option[];
}
interface StartResponse {
  attemptId: string;
  challenge: { id: string; day: number; title: string; subtitle: string | null; timeLimitSec: number | null };
  questions: Question[];
}
interface AiOpponentResult {
  correctCount: number;
  totalCount: number;
  accuracy: number;
  timeTakenSec: number;
}
interface SubmitResponse {
  correctCount: number;
  totalCount: number;
  accuracy: number;
  finalPoints: number;
  timeTakenSec: number;
  rank: number;
  opponent: AiOpponentResult | null;
}

export default function ChallengePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [session, setSession] = useState<StartResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | null>>({});
  const [focusMode, setFocusMode] = useState(false);
  const [confirmLeaveFocus, setConfirmLeaveFocus] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [result, setResult] = useState<SubmitResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    fetch(`/api/challenges/${params.id}/start`, { method: "POST" })
      .then(async (r) => {
        if (!r.ok) {
          const d = await r.json().catch(() => ({}));
          throw new Error(d.error ?? "Could not start challenge");
        }
        return r.json();
      })
      .then((data: StartResponse) => {
        setSession(data);
        startTimeRef.current = Date.now();
      })
      .catch((e) => setError(e.message));
  }, [params.id]);

  useEffect(() => {
    if (!session || result) return;
    const interval = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [session, result]);

  const toggleFocusMode = useCallback(async () => {
    if (!focusMode) {
      try {
        await containerRef.current?.requestFullscreen?.();
      } catch {
        // fullscreen unsupported — fall back to the immersive CSS-only mode
      }
      setFocusMode(true);
    } else {
      setConfirmLeaveFocus(true);
    }
  }, [focusMode]);

  function confirmLeave() {
    if (document.fullscreenElement) document.exitFullscreen?.();
    setFocusMode(false);
    setConfirmLeaveFocus(false);
  }

  async function submitChallenge() {
    if (!session) return;
    setSubmitting(true);
    const res = await fetch(`/api/challenges/${params.id}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        attemptId: session.attemptId,
        timeTakenSec: elapsedSec,
        answers: session.questions.map((q) => ({
          questionId: q.id,
          selectedOptionId: answers[q.id] ?? null,
        })),
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Could not submit challenge");
      return;
    }
    setResult(await res.json());
  }

  function selectOption(questionId: string, optionId: string) {
    if (answers[questionId]) return;
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
    setTimeout(() => {
      const isLast = currentIndex === (session?.questions.length ?? 1) - 1;
      if (!isLast) setCurrentIndex((i) => i + 1);
    }, 350);
  }

  if (error) return <ErrorScreen message={error} onBack={() => router.push("/home")} />;
  if (result) return <ResultScreen result={result} onHome={() => router.push("/home")} onLeaderboard={() => router.push("/leaderboard")} />;
  if (!session) return <LoadingScreen />;

  const question = session.questions[currentIndex];
  const progress = ((currentIndex + (answers[question.id] ? 1 : 0)) / session.questions.length) * 100;
  const answeredAll = session.questions.every((q) => answers[q.id]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "min-h-screen flex flex-col font-[family-name:var(--font-body)]",
        focusMode ? "bg-black text-white" : "bg-[var(--bg)] text-[var(--ink)]"
      )}
    >
      <div className={cn("px-5 py-4 flex items-center justify-between border-b-2", focusMode ? "border-white/20" : "border-[var(--line)]")}>
        <div className="font-[family-name:var(--font-mono)]">
          <p className="text-xs font-bold text-[var(--blue)] uppercase tracking-widest">
            Day {session.challenge.day} · {session.challenge.title}
          </p>
          <p className="text-sm text-[var(--muted)]">
            {currentIndex + 1} / {session.questions.length}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-[family-name:var(--font-mono)] text-sm font-bold border-2 border-current px-3 py-1">
            {formatTime(elapsedSec)}
          </span>
          <button
            onClick={toggleFocusMode}
            className="w-9 h-9 grid place-items-center border-2 border-current hover:bg-[var(--yellow)] hover:text-black"
            aria-label="Toggle focus mode"
          >
            {focusMode ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>
          <button
            onClick={() => router.push("/home")}
            className="w-9 h-9 grid place-items-center border-2 border-current hover:bg-[var(--red)] hover:text-white"
            aria-label="Exit challenge"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className={cn("h-2 border-b-2", focusMode ? "border-white/20 bg-white/10" : "border-[var(--line)] bg-black/5")}>
        <div className="h-full bg-[var(--blue)] transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      <div className="flex-1 flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-xl">
          <p className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl leading-snug uppercase">
            {question.prompt}
          </p>

          <div className="mt-8 grid gap-3">
            {question.options.map((opt) => {
              const selected = answers[question.id] === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => selectOption(question.id, opt.id)}
                  disabled={!!answers[question.id]}
                  className={cn(
                    "text-left border-2 px-5 py-4 transition-all flex items-center gap-4 font-[family-name:var(--font-mono)]",
                    focusMode ? "border-white/30 hover:border-[var(--yellow)]" : "border-[var(--line)] hover:bg-[var(--yellow)] hover:text-black",
                    selected && "bg-[var(--yellow)] text-black"
                  )}
                >
                  <span
                    className={cn(
                      "w-8 h-8 grid place-items-center border-2 font-bold text-sm shrink-0",
                      selected ? "bg-black text-[var(--yellow)] border-black" : "border-current"
                    )}
                  >
                    {opt.label}
                  </span>
                  <span>{opt.text}</span>
                </button>
              );
            })}
          </div>

          {answeredAll && (
            <Button className="mt-8 w-full" size="lg" onClick={submitChallenge} disabled={submitting}>
              {submitting ? "Submitting…" : "Submit challenge"}
            </Button>
          )}
        </div>
      </div>

      {confirmLeaveFocus && (
        <div className="fixed inset-0 bg-black/70 grid place-items-center z-50 px-5">
          <div className="bg-[var(--paper)] text-[var(--ink)] border-2 border-[var(--line)] p-6 max-w-sm w-full text-center font-[family-name:var(--font-mono)]">
            <p className="font-bold uppercase">Leave focus mode?</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Button variant="secondary" onClick={() => setConfirmLeaveFocus(false)}>Stay</Button>
              <Button onClick={confirmLeave}>Leave</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatTime(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function LoadingScreen() {
  return (
    <div className="min-h-screen grid place-items-center bg-[var(--bg)]">
      <p className="font-[family-name:var(--font-mono)] text-[var(--muted)] uppercase tracking-widest animate-pulse">
        Loading challenge…
      </p>
    </div>
  );
}

function ErrorScreen({ message, onBack }: { message: string; onBack: () => void }) {
  return (
    <div className="min-h-screen grid place-items-center bg-[var(--bg)] px-5">
      <div className="text-center font-[family-name:var(--font-mono)]">
        <p className="text-lg font-bold">{message}</p>
        <Button className="mt-4" onClick={onBack}>Back to home</Button>
      </div>
    </div>
  );
}

function ResultScreen({
  result,
  onHome,
  onLeaderboard,
}: {
  result: SubmitResponse;
  onHome: () => void;
  onLeaderboard: () => void;
}) {
  return (
    <div className="min-h-screen grid place-items-center bg-[var(--bg)] px-5 py-16">
      <div className="max-w-md w-full">
        <div className="border-2 border-[var(--line)] bg-[var(--paper)]">
          <div className="border-b-2 border-[var(--line)] bg-[var(--ink)] text-[var(--bg)] px-6 py-4 text-center">
            <p className="font-[family-name:var(--font-mono)] text-xs font-bold uppercase tracking-widest">
              Challenge Complete
            </p>
          </div>
          <div className="p-8 text-center font-[family-name:var(--font-mono)]">
            <p className="text-5xl font-bold text-[var(--blue)]">+{result.finalPoints}</p>
            <p className="text-sm text-[var(--muted)] uppercase tracking-widest mt-1">XP earned</p>

            <div className="mt-8 grid grid-cols-3 border-2 border-[var(--line)] divide-x-2 divide-[var(--line)]">
              <ResultStat label="Accuracy" value={`${result.accuracy}%`} />
              <ResultStat label="Time" value={formatTime(result.timeTakenSec)} />
              <ResultStat label="Correct" value={`${result.correctCount}/${result.totalCount}`} />
            </div>

            {result.opponent && (
              <div className="mt-6 border-2 border-[var(--line)] p-5">
                <p className="text-xs font-bold text-[var(--muted)] uppercase mb-3 tracking-widest">Bot Battle</p>
                <div className="flex items-center justify-between">
                  <div className="text-center">
                    <p className="text-sm font-bold">YOU</p>
                    <p className="text-2xl font-bold">{result.correctCount}/{result.totalCount}</p>
                  </div>
                  <p className="font-[family-name:var(--font-display)] text-lg text-[var(--muted)]">VS</p>
                  <div className="text-center">
                    <p className="text-sm font-bold">AI</p>
                    <p className="text-2xl font-bold">{result.opponent.correctCount}/{result.opponent.totalCount}</p>
                  </div>
                </div>
                <p className="mt-4 font-bold uppercase text-sm">
                  {result.correctCount > result.opponent.correctCount
                    ? "You beat the bot!"
                    : result.correctCount === result.opponent.correctCount
                    ? "It's a tie!"
                    : "The bot won this round."}
                </p>
              </div>
            )}

            <p className="mt-6 text-[var(--muted)]">
              Current rank: <span className="font-bold text-[var(--ink)]">#{result.rank}</span>
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <Button variant="secondary" onClick={onLeaderboard}>Leaderboard</Button>
          <Button onClick={onHome}>Back home</Button>
        </div>
      </div>
    </div>
  );
}

function ResultStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center py-4">
      <p className="text-xl font-bold">{value}</p>
      <p className="text-[10px] text-[var(--muted)] uppercase tracking-widest mt-1">{label}</p>
    </div>
  );
}
