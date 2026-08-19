import type { LevelKey } from "@/lib/levels";

export interface AiOpponentResult {
  correctCount: number;
  totalCount: number;
  accuracy: number;
  timeTakenSec: number;
  commentary?: string;
  /** Per-question correct/incorrect, in question order — powers the live round-by-round reveal. */
  perQuestion: boolean[];
}

/**
 * Difficulty knobs per level — how likely the MVP bot is to answer each
 * question correctly, and roughly how fast it "thinks".
 */
const DIFFICULTY: Record<LevelKey, { accuracy: number; avgSecPerQuestion: number; label: string }> = {
  A1_A2: { accuracy: 0.55, avgSecPerQuestion: 12, label: "a beginner (A1-A2) English learner" },
  B1: { accuracy: 0.68, avgSecPerQuestion: 10, label: "an intermediate (B1) English learner" },
  B2: { accuracy: 0.8, avgSecPerQuestion: 8, label: "an upper-intermediate (B2) English learner" },
  C1: { accuracy: 0.9, avgSecPerQuestion: 6, label: "an advanced (C1) English learner" },
};

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_MODEL = "claude-haiku-4-5";

/**
 * MVP opponent: a simple weighted-random model calibrated per level.
 * Accuracy is tuned so a B2 bot meaningfully outperforms an A1-A2 bot.
 */
function simulateStatistically(level: LevelKey, totalQuestions: number): AiOpponentResult {
  const { accuracy, avgSecPerQuestion } = DIFFICULTY[level];

  const perQuestion: boolean[] = [];
  for (let i = 0; i < totalQuestions; i++) {
    perQuestion.push(Math.random() < accuracy);
  }
  const correctCount = perQuestion.filter(Boolean).length;

  const jitterFactor = 0.85 + Math.random() * 0.3;
  const timeTakenSec = Math.round(totalQuestions * avgSecPerQuestion * jitterFactor);

  return {
    correctCount,
    totalCount: totalQuestions,
    accuracy: totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0,
    timeTakenSec,
    perQuestion,
  };
}

/**
 * Real-opponent mode: asks Claude to roleplay the target level and judge,
 * per question, whether that level of learner would plausibly get it right
 * — so harder questions in the set are more likely to trip the bot up too,
 * instead of every question having an identical independent coin-flip odds.
 * Also returns a one-line battle commentary for the "fight" result screen.
 *
 * Falls back to the statistical simulator on any failure (missing/invalid
 * key, network error, bad response) — a broken AI call must never block
 * grading or crash a challenge submission.
 */
export async function simulateAiOpponent(
  level: LevelKey,
  totalQuestions: number,
  questions?: { prompt: string }[]
): Promise<AiOpponentResult> {
  if (ANTHROPIC_API_KEY && questions && questions.length === totalQuestions && totalQuestions > 0) {
    try {
      return await simulateWithClaude(level, questions);
    } catch (err) {
      console.error("AI opponent: Claude call failed, falling back to statistical simulation", err);
    }
  }
  return simulateStatistically(level, totalQuestions);
}

async function simulateWithClaude(
  level: LevelKey,
  questions: { prompt: string }[]
): Promise<AiOpponentResult> {
  const { accuracy, avgSecPerQuestion, label } = DIFFICULTY[level];

  const numberedQuestions = questions.map((q, i) => `${i + 1}. ${q.prompt}`).join("\n");

  const systemPrompt = `You are simulating ${label} taking an English test, competing head-to-head against a real human player in a "Can You Beat The B2?" battle. This learner answers correctly about ${Math.round(
    accuracy * 100
  )}% of the time on average, but real learners don't miss questions uniformly at random — they're more likely to get genuinely harder or trickier questions wrong, and easier ones right. Read the question list, judge each one's difficulty for this learner, and decide a plausible correct/incorrect outcome per question consistent with that overall accuracy. Then write one short, punchy battle-commentary line (under 15 words, playful, no emoji) about how the AI opponent performed overall, to show on a "fight" result screen.

Respond with ONLY strict JSON, no prose, no markdown fences, in this exact shape:
{"results": [true, false, ...], "commentary": "..."}
"results" must have exactly ${questions.length} boolean entries, in question order.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY as string,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 512,
      system: systemPrompt,
      messages: [{ role: "user", content: numberedQuestions }],
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) throw new Error(`Anthropic API returned ${res.status}`);

  const data = await res.json();
  const text: string = data?.content?.[0]?.text ?? "";
  const parsed = JSON.parse(text.trim());

  if (!Array.isArray(parsed.results) || parsed.results.length !== questions.length) {
    throw new Error("Malformed AI opponent response shape");
  }

  const correctCount = parsed.results.filter(Boolean).length;
  const jitterFactor = 0.85 + Math.random() * 0.3;
  const timeTakenSec = Math.round(questions.length * avgSecPerQuestion * jitterFactor);

  return {
    correctCount,
    totalCount: questions.length,
    accuracy: Math.round((correctCount / questions.length) * 100),
    timeTakenSec,
    commentary: typeof parsed.commentary === "string" ? parsed.commentary.slice(0, 200) : undefined,
    perQuestion: parsed.results as boolean[],
  };
}
