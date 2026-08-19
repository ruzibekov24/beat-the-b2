import type { LevelKey } from "@/lib/levels";

export interface AiOpponentResult {
  correctCount: number;
  totalCount: number;
  accuracy: number;
  timeTakenSec: number;
}

/**
 * Difficulty knobs per level — how likely the MVP bot is to answer each
 * question correctly, and roughly how fast it "thinks".
 */
const DIFFICULTY: Record<LevelKey, { accuracy: number; avgSecPerQuestion: number }> = {
  A1_A2: { accuracy: 0.55, avgSecPerQuestion: 12 },
  B1: { accuracy: 0.68, avgSecPerQuestion: 10 },
  B2: { accuracy: 0.8, avgSecPerQuestion: 8 },
  C1: { accuracy: 0.9, avgSecPerQuestion: 6 },
};

/**
 * MVP opponent: a simple weighted-random model calibrated per level.
 * This deliberately isn't "random answers" — accuracy is tuned so a B2
 * bot meaningfully outperforms an A1–A2 bot, per spec §24.
 *
 * SWAP POINT: to replace with a real AI API (e.g. having an LLM actually
 * answer each question), implement a function with the same signature
 * that calls out to that API instead of using Math.random(), and swap the
 * export in the AI battle route. Nothing else in the app needs to change —
 * this function is the sole integration boundary.
 */
export function simulateAiOpponent(level: LevelKey, totalQuestions: number): AiOpponentResult {
  const { accuracy, avgSecPerQuestion } = DIFFICULTY[level];

  let correctCount = 0;
  for (let i = 0; i < totalQuestions; i++) {
    if (Math.random() < accuracy) correctCount++;
  }

  // Add a little jitter to the bot's pacing so it doesn't feel robotic.
  const jitterFactor = 0.85 + Math.random() * 0.3;
  const timeTakenSec = Math.round(totalQuestions * avgSecPerQuestion * jitterFactor);

  return {
    correctCount,
    totalCount: totalQuestions,
    accuracy: totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0,
    timeTakenSec,
  };
}
