"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Maximize, Minimize, X, Swords, Check, Heart } from "lucide-react";
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
  timeLimitSec: number | null;
  options: Option[];
  wordLength: number | null;
  scrambledLetters: string[] | null;
}
interface HangmanState {
  guessed: string[];
  revealed: Record<number, string>;
  wrong: number;
}
const HANGMAN_MAX_WRONG = 6;
const ALPHABET = "abcdefghijklmnopqrstuvwxyz".split("");
interface StartResponse {
  attemptId: string;
  challenge: { id: string; day: number; title: string; subtitle: string | null; type: string; timeLimitSec: number | null };
  questions: Question[];
  reading: { title: string; content: string; timeLimitSec: number | null } | null;
  listening: { title: string; audioUrl: string; durationSec: number | null } | null;
}
interface BattleReveal {
  userCorrect: boolean;
  aiCorrect: boolean;
}
interface AiOpponentResult {
  correctCount: number;
  totalCount: number;
  accuracy: number;
  timeTakenSec: number;
  commentary?: string;
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
  const [textAnswers, setTextAnswers] = useState<Record<string, string>>({});
  const [questionTimeLeft, setQuestionTimeLeft] = useState<number | null>(null);
  const [timedOut, setTimedOut] = useState<Record<string, boolean>>({});
  const [focusMode, setFocusMode] = useState(false);
  const [confirmLeaveFocus, setConfirmLeaveFocus] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [result, setResult] = useState<SubmitResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [battleReveal, setBattleReveal] = useState<BattleReveal | null>(null);
  const [battleScore, setBattleScore] = useState({ user: 0, ai: 0 });
  const [hangman, setHangman] = useState<Record<string, HangmanState>>({});
  const [wordCollectOrder, setWordCollectOrder] = useState<Record<string, number[]>>({});
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

  // Per-question countdown — independent of the overall challenge timer.
  // Auto-advances (leaving the question unanswered) when it hits zero.
  useEffect(() => {
    if (!session || result) return;
    const q = session.questions[currentIndex];
    if (!q?.timeLimitSec) {
      setQuestionTimeLeft(null);
      return;
    }
    setQuestionTimeLeft(q.timeLimitSec);
    const interval = setInterval(() => {
      setQuestionTimeLeft((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(interval);
          setTimedOut((t) => ({ ...t, [q.id]: true }));
          goNext();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, session, result]);

  function isAnswered(q: Question): boolean {
    if (timedOut[q.id]) return true;
    if (q.type === "fill_blank") return !!textAnswers[q.id]?.trim();
    return !!answers[q.id];
  }

  function goNext() {
    setCurrentIndex((i) => {
      const isLast = i === (session?.questions.length ?? 1) - 1;
      return isLast ? i : i + 1;
    });
  }

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
          selectedOptionId: q.type === "fill_blank" ? null : answers[q.id] ?? null,
          textAnswer: q.type === "fill_blank" ? textAnswers[q.id] ?? null : null,
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

  const isLiveBattle = session?.challenge.type === "ai_battle";

  async function revealBattleRound(questionId: string, selectedOptionId: string | null, textAnswer: string | null) {
    if (!session) return;
    try {
      const res = await fetch(`/api/challenges/${params.id}/battle-round`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId: session.attemptId, questionId, selectedOptionId, textAnswer }),
      });
      if (res.ok) {
        const { userCorrect, aiCorrect } = await res.json();
        setBattleReveal({ userCorrect, aiCorrect });
        setBattleScore((s) => ({ user: s.user + (userCorrect ? 1 : 0), ai: s.ai + (aiCorrect ? 1 : 0) }));
      }
    } catch {
      // Live reveal is a UX flourish, not scoring — a failed round-check must
      // never block progress. Official scoring still happens at /submit.
    }
    setTimeout(() => {
      setBattleReveal(null);
      goNext();
    }, 1700);
  }

  async function guessLetter(questionId: string, letter: string) {
    if (!session || hangman[questionId]?.guessed.includes(letter)) return;

    const res = await fetch(`/api/challenges/${params.id}/hangman-guess`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attemptId: session.attemptId, questionId, letter }),
    });
    if (!res.ok) return;
    const { correct, positions } = await res.json();

    // Just merge the guess in — win/lose detection and advancing happens in
    // a separate effect that reacts to this state, rather than trying to
    // read the result back out of the updater here. React doesn't guarantee
    // a functional setState updater runs synchronously relative to this
    // function's continuation, so that read was itself a race condition.
    setHangman((prev) => {
      const state = prev[questionId] ?? { guessed: [], revealed: {}, wrong: 0 };
      const newRevealed = { ...state.revealed };
      if (correct) positions.forEach((p: number) => (newRevealed[p] = letter));
      return {
        ...prev,
        [questionId]: {
          guessed: [...state.guessed, letter],
          revealed: newRevealed,
          wrong: state.wrong + (correct ? 0 : 1),
        },
      };
    });
  }

  // Reacts to hangman guesses landing — finalizes the round (win or lose)
  // exactly once per question, then advances after a short pause.
  useEffect(() => {
    if (!session || result) return;
    const q = session.questions[currentIndex];
    if (session.challenge.type !== "hangman" || !q || q.wordLength == null) return;
    if (timedOut[q.id] || textAnswers[q.id]) return; // already finalized

    const state = hangman[q.id];
    if (!state) return;

    const won = Object.keys(state.revealed).length === q.wordLength;
    const lost = state.wrong >= HANGMAN_MAX_WRONG;
    if (!won && !lost) return;

    if (won) {
      const word = Array.from({ length: q.wordLength }, (_, i) => state.revealed[i]).join("");
      setTextAnswers((prev) => ({ ...prev, [q.id]: word }));
    } else {
      setTimedOut((t) => ({ ...t, [q.id]: true }));
    }
    const timer = setTimeout(() => goNext(), 1400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hangman, currentIndex, session, result]);

  function tapWordCollectLetter(questionId: string, letters: string[], idx: number) {
    setWordCollectOrder((prev) => {
      const order = prev[questionId] ?? [];
      if (order.includes(idx)) return prev;
      const nextOrder = [...order, idx];
      if (nextOrder.length === letters.length) {
        setTextAnswers((t) => ({ ...t, [questionId]: nextOrder.map((i) => letters[i]).join("") }));
      }
      return { ...prev, [questionId]: nextOrder };
    });
  }

  function undoWordCollectLetter(questionId: string) {
    setWordCollectOrder((prev) => ({ ...prev, [questionId]: (prev[questionId] ?? []).slice(0, -1) }));
    setTextAnswers((prev) => ({ ...prev, [questionId]: "" }));
  }

  function selectOption(questionId: string, optionId: string) {
    if (answers[questionId]) return;
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
    if (isLiveBattle) {
      revealBattleRound(questionId, optionId, null);
      return;
    }
    setTimeout(() => {
      const isLast = currentIndex === (session?.questions.length ?? 1) - 1;
      if (!isLast) goNext();
    }, 350);
  }

  function confirmTextAnswer(questionId: string) {
    if (!textAnswers[questionId]?.trim()) return;
    if (isLiveBattle) {
      revealBattleRound(questionId, null, textAnswers[questionId]);
      return;
    }
    goNext();
  }

  if (error) return <ErrorScreen message={error} onBack={() => router.push("/home")} />;
  if (result) return <ResultScreen result={result} onHome={() => router.push("/home")} onLeaderboard={() => router.push("/leaderboard")} />;
  if (!session) return <LoadingScreen />;

  const question = session.questions[currentIndex];
  const isHangman = session.challenge.type === "hangman";
  const isWordCollect = session.challenge.type === "word_collect";
  const progress = ((currentIndex + (isAnswered(question) ? 1 : 0)) / session.questions.length) * 100;
  const answeredAll = session.questions.every(isAnswered);

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
          {isLiveBattle && (
            <span className="font-[family-name:var(--font-mono)] text-sm font-bold border-2 border-current px-3 py-1 flex items-center gap-1.5">
              <span className="text-[var(--blue)]">{battleScore.user}</span>
              <Swords size={12} className="text-[var(--muted)]" />
              <span className="text-[var(--purple)]">{battleScore.ai}</span>
            </span>
          )}
          {questionTimeLeft !== null && (
            <span
              className={cn(
                "font-[family-name:var(--font-mono)] text-sm font-bold border-2 px-3 py-1",
                questionTimeLeft <= 3
                  ? "border-[var(--red)] text-[var(--red)] animate-pulse"
                  : "border-current"
              )}
            >
              {questionTimeLeft}s
            </span>
          )}
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
        <div className={cn("w-full", session.reading ? "max-w-3xl" : "max-w-xl")}>
          {session.reading && <ReadingPassage reading={session.reading} focusMode={focusMode} />}
          {session.listening && <ListeningPlayer listening={session.listening} focusMode={focusMode} />}

          <p className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl leading-snug uppercase">
            {question.prompt}
          </p>

          {isHangman ? (
            <HangmanGame
              question={question}
              state={hangman[question.id] ?? { guessed: [], revealed: {}, wrong: 0 }}
              onGuess={(letter) => guessLetter(question.id, letter)}
              focusMode={focusMode}
            />
          ) : isWordCollect ? (
            <div className="mt-8">
              <WordCollectGame
                question={question}
                order={wordCollectOrder[question.id] ?? []}
                onTap={(idx) => tapWordCollectLetter(question.id, question.scrambledLetters ?? [], idx)}
                onUndo={() => undoWordCollectLetter(question.id)}
                focusMode={focusMode}
              />
              {currentIndex < session.questions.length - 1 && (
                <Button
                  className="mt-6 w-full"
                  variant="secondary"
                  onClick={() => confirmTextAnswer(question.id)}
                  disabled={!textAnswers[question.id]}
                >
                  Next
                </Button>
              )}
            </div>
          ) : question.type === "fill_blank" ? (
            <div className="mt-8">
              <input
                type="text"
                autoFocus
                value={textAnswers[question.id] ?? ""}
                onChange={(e) => setTextAnswers((prev) => ({ ...prev, [question.id]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") confirmTextAnswer(question.id);
                }}
                placeholder="Type your answer…"
                className={cn(
                  "w-full border-2 px-5 py-4 font-[family-name:var(--font-mono)] text-lg bg-transparent outline-none",
                  focusMode ? "border-white/30 focus:border-[var(--yellow)]" : "border-[var(--line)] focus:bg-[var(--yellow)]/10"
                )}
              />
              {currentIndex < session.questions.length - 1 && (
                <Button
                  className="mt-4 w-full"
                  variant="secondary"
                  onClick={() => confirmTextAnswer(question.id)}
                  disabled={!textAnswers[question.id]?.trim()}
                >
                  Next
                </Button>
              )}
            </div>
          ) : question.type === "true_false" ? (
            <div className="mt-8 grid grid-cols-2 gap-4">
              {question.options.map((opt) => {
                const selected = answers[question.id] === opt.id;
                const isTrue = opt.text.trim().toLowerCase() === "true";
                return (
                  <button
                    key={opt.id}
                    onClick={() => selectOption(question.id, opt.id)}
                    disabled={!!answers[question.id]}
                    className={cn(
                      "border-2 py-10 flex flex-col items-center gap-2 font-[family-name:var(--font-display)] text-lg uppercase transition-all",
                      focusMode ? "border-white/30" : "border-[var(--line)]",
                      !answers[question.id] && (isTrue ? "hover:bg-[var(--green)]/20" : "hover:bg-[var(--red)]/20"),
                      selected && (isTrue ? "bg-[var(--green)] text-black" : "bg-[var(--red)] text-black")
                    )}
                  >
                    {isTrue ? <Check size={32} /> : <X size={32} />}
                    {opt.text}
                  </button>
                );
              })}
            </div>
          ) : (
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
          )}

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

      {battleReveal && <RoundReveal reveal={battleReveal} score={battleScore} />}
    </div>
  );
}

/**
 * The passage a reading challenge's questions refer to. Kept scrollable and
 * pinned above the question so it stays available on every question rather
 * than only on the first.
 */
function ReadingPassage({
  reading,
  focusMode,
}: {
  reading: { title: string; content: string };
  focusMode: boolean;
}) {
  return (
    <div
      className={cn(
        "mb-8 border-2 p-5 max-h-[45vh] overflow-y-auto",
        focusMode ? "border-white/20 bg-white/5" : "border-[var(--line)] bg-black/[0.03]"
      )}
    >
      <p className="font-[family-name:var(--font-mono)] text-xs font-bold uppercase tracking-widest text-[var(--blue)]">
        {reading.title}
      </p>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed">
        {reading.content
          .split(/\n\s*\n/)
          // Passages are usually pasted out of a PDF, which hard-wraps mid
          // sentence — collapse those breaks so the text reflows to the
          // reader's width instead of keeping the source's line endings.
          .map((paragraph) => paragraph.replace(/\s*\n\s*/g, " ").trim())
          .filter(Boolean)
          .map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
      </div>
    </div>
  );
}

/** The audio a listening challenge's questions refer to. */
function ListeningPlayer({
  listening,
  focusMode,
}: {
  listening: { title: string; audioUrl: string };
  focusMode: boolean;
}) {
  return (
    <div
      className={cn(
        "mb-8 border-2 p-5",
        focusMode ? "border-white/20 bg-white/5" : "border-[var(--line)] bg-black/[0.03]"
      )}
    >
      <p className="font-[family-name:var(--font-mono)] text-xs font-bold uppercase tracking-widest text-[var(--blue)]">
        {listening.title}
      </p>
      <audio controls preload="metadata" src={listening.audioUrl} className="mt-3 w-full">
        Your browser does not support audio playback.
      </audio>
    </div>
  );
}

function RoundReveal({ reveal, score }: { reveal: BattleReveal; score: { user: number; ai: number } }) {
  return (
    <div className="fixed inset-0 bg-black/80 grid place-items-center z-50 px-5">
      <div className="fight-stamp bg-[var(--paper)] text-[var(--ink)] border-2 border-[var(--line)] px-8 py-8 max-w-xs w-full text-center font-[family-name:var(--font-mono)]">
        <div className="flex items-center justify-center gap-6">
          <RoundFace label="YOU" correct={reveal.userCorrect} />
          <Swords size={20} className="text-[var(--muted)]" />
          <RoundFace label="AI" correct={reveal.aiCorrect} />
        </div>
        <p className="mt-6 text-xs uppercase tracking-widest text-[var(--muted)]">Score</p>
        <p className="mt-1 text-2xl font-bold">
          <span className="text-[var(--blue)]">{score.user}</span>
          <span className="text-[var(--muted)] mx-2">—</span>
          <span className="text-[var(--purple)]">{score.ai}</span>
        </p>
      </div>
    </div>
  );
}

function RoundFace({ label, correct }: { label: string; correct: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={cn(
          "w-14 h-14 grid place-items-center border-2 border-[var(--line)]",
          correct ? "bg-[var(--green)]" : "bg-[var(--red)]"
        )}
      >
        {correct ? <Check size={24} className="text-black" /> : <X size={24} className="text-black" />}
      </div>
      <p className="text-xs font-bold">{label}</p>
    </div>
  );
}

function WordCollectGame({
  question,
  order,
  onTap,
  onUndo,
  focusMode,
}: {
  question: Question;
  order: number[];
  onTap: (idx: number) => void;
  onUndo: () => void;
  focusMode: boolean;
}) {
  const letters = question.scrambledLetters ?? [];
  const used = new Set(order);

  return (
    <div>
      <div
        className={cn(
          "flex flex-wrap justify-center gap-2 min-h-[3.25rem] border-b-4 pb-3",
          focusMode ? "border-white/40" : "border-[var(--line)]"
        )}
      >
        {order.length === 0 && (
          <p className="text-xs text-[var(--muted)] self-center font-[family-name:var(--font-mono)]">
            Tap letters below to spell the word
          </p>
        )}
        {order.map((idx, pos) => (
          <div
            key={pos}
            className={cn(
              "w-10 h-10 border-2 grid place-items-center font-[family-name:var(--font-mono)] font-bold text-lg uppercase",
              focusMode ? "border-[var(--yellow)] bg-white/10" : "border-[var(--line)] bg-[var(--yellow)]"
            )}
          >
            {letters[idx]}
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {letters.map((letter, i) => (
          <button
            key={i}
            onClick={() => onTap(i)}
            disabled={used.has(i)}
            className={cn(
              "w-10 h-10 border-2 grid place-items-center font-[family-name:var(--font-mono)] font-bold text-lg uppercase transition-all",
              used.has(i)
                ? "opacity-20 border-[var(--muted)] cursor-default"
                : focusMode
                ? "border-white/30 hover:border-[var(--yellow)]"
                : "border-[var(--line)] hover:bg-[var(--yellow)] hover:text-black"
            )}
          >
            {letter}
          </button>
        ))}
      </div>

      {order.length > 0 && (
        <button
          onClick={onUndo}
          className="mt-4 block mx-auto text-xs text-[var(--muted)] hover:underline font-[family-name:var(--font-mono)] uppercase tracking-wide"
        >
          Undo last letter
        </button>
      )}
    </div>
  );
}

function HangmanGame({
  question,
  state,
  onGuess,
  focusMode,
}: {
  question: Question;
  state: HangmanState;
  onGuess: (letter: string) => void;
  focusMode: boolean;
}) {
  const wordLength = question.wordLength ?? 0;
  const livesLeft = HANGMAN_MAX_WRONG - state.wrong;
  const finished = livesLeft <= 0 || Object.keys(state.revealed).length === wordLength;

  return (
    <div className="mt-8">
      <div className="flex items-center justify-center gap-1.5">
        {Array.from({ length: HANGMAN_MAX_WRONG }).map((_, i) => (
          <Heart
            key={i}
            size={20}
            className={i < livesLeft ? "text-[var(--red)]" : "text-[var(--muted)]"}
            fill={i < livesLeft ? "currentColor" : "none"}
          />
        ))}
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {Array.from({ length: wordLength }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "w-9 h-11 border-b-4 grid place-items-center font-[family-name:var(--font-mono)] text-xl font-bold uppercase",
              focusMode ? "border-white/40" : "border-[var(--line)]"
            )}
          >
            {state.revealed[i] ?? ""}
          </div>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-7 sm:grid-cols-9 gap-1.5">
        {ALPHABET.map((letter) => {
          const guessed = state.guessed.includes(letter);
          const wasCorrect = guessed && Object.values(state.revealed).includes(letter);
          return (
            <button
              key={letter}
              onClick={() => onGuess(letter)}
              disabled={guessed || finished}
              className={cn(
                "aspect-square border-2 grid place-items-center font-[family-name:var(--font-mono)] font-bold uppercase text-sm transition-all",
                focusMode ? "border-white/30" : "border-[var(--line)]",
                !guessed && !finished && (focusMode ? "hover:border-[var(--yellow)]" : "hover:bg-[var(--yellow)] hover:text-black"),
                guessed && wasCorrect && "bg-[var(--green)] text-black",
                guessed && !wasCorrect && "bg-[var(--red)] text-black opacity-60"
              )}
            >
              {letter}
            </button>
          );
        })}
      </div>
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

            {result.opponent && <FightResult result={result} opponent={result.opponent} />}

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

function FightResult({ result, opponent }: { result: SubmitResponse; opponent: AiOpponentResult }) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 150);
    return () => clearTimeout(t);
  }, []);

  const outcome =
    result.correctCount > opponent.correctCount
      ? "win"
      : result.correctCount === opponent.correctCount
      ? "draw"
      : "loss";

  const stampText = outcome === "win" ? "VICTORY" : outcome === "draw" ? "DRAW" : "DEFEAT";
  const stampColor =
    outcome === "win" ? "var(--green)" : outcome === "draw" ? "var(--yellow)" : "var(--red)";

  return (
    <div className="mt-6 border-2 border-[var(--line)] p-5 overflow-hidden">
      <div className="flex items-center justify-center gap-2 mb-4">
        <Swords size={16} className="text-[var(--muted)]" />
        <p className="text-xs font-bold text-[var(--muted)] uppercase tracking-widest">AI Battle</p>
      </div>

      <div className="flex items-center justify-center gap-4">
        <FighterBar
          label="YOU"
          percent={result.accuracy}
          color="var(--blue)"
          revealed={revealed}
          align="right"
        />
        <p className="fight-vs font-[family-name:var(--font-display)] text-2xl shrink-0" style={{ color: stampColor }}>
          VS
        </p>
        <FighterBar
          label="AI"
          percent={opponent.accuracy}
          color="var(--purple)"
          revealed={revealed}
          align="left"
        />
      </div>

      <div className="mt-6 flex justify-center">
        <p
          className="fight-stamp inline-block border-2 px-5 py-1.5 font-[family-name:var(--font-display)] text-xl uppercase tracking-wider"
          style={{ color: stampColor, borderColor: stampColor, transform: "rotate(-6deg)" }}
        >
          {stampText}
        </p>
      </div>

      {opponent.commentary && (
        <p className="mt-4 text-center text-xs text-[var(--muted)] font-[family-name:var(--font-mono)] italic">
          “{opponent.commentary}”
        </p>
      )}
    </div>
  );
}

function FighterBar({
  label,
  percent,
  color,
  revealed,
  align,
}: {
  label: string;
  percent: number;
  color: string;
  revealed: boolean;
  align: "left" | "right";
}) {
  return (
    <div className="flex-1 min-w-0">
      <div className={cn("flex items-baseline gap-2 mb-1.5", align === "right" ? "justify-end" : "justify-start")}>
        {align === "left" && <span className="text-sm font-bold shrink-0">{label}</span>}
        <span className="text-sm font-bold font-[family-name:var(--font-mono)]" style={{ color }}>
          {percent}%
        </span>
        {align === "right" && <span className="text-sm font-bold shrink-0">{label}</span>}
      </div>
      <div className="h-3 border-2 border-[var(--line)] bg-[var(--bg)] overflow-hidden">
        <div
          className={cn("fight-bar-fill h-full", align === "right" && "ml-auto")}
          style={{ width: revealed ? `${percent}%` : "0%", backgroundColor: color }}
        />
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
