import { db } from "./db";
import type { LevelKey } from "@/lib/levels";

/**
 * Returns the currently configured level multipliers from the
 * competition_settings singleton row (falls back to spec defaults
 * if the row hasn't been seeded yet).
 */
export async function getMultipliers(): Promise<Record<LevelKey, number>> {
  const settings = await db.competitionSettings.findUnique({ where: { id: "singleton" } });
  return {
    A1_A2: settings?.multiplierA1A2 ?? 1.0,
    B1: settings?.multiplierB1 ?? 1.25,
    B2: settings?.multiplierB2 ?? 1.5,
    C1: settings?.multiplierC1 ?? 2.0,
  };
}

export async function getMultiplierForLevel(level: LevelKey): Promise<number> {
  const multipliers = await getMultipliers();
  return multipliers[level];
}

/**
 * Grades a single submitted attempt entirely server-side.
 * - Looks up correct options from the DB (never trusts client "correct" flags)
 * - Computes raw points from question.points
 * - Applies the user's LOCKED, server-stored level multiplier
 * - Persists everything atomically
 *
 * `submittedAnswers` is just { questionId, selectedOptionId, textAnswer }
 * pairs — the client never tells us what's correct or how many points to
 * award.
 */
function normalizeText(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

export async function gradeAttempt(params: {
  attemptId: string;
  userId: string;
  submittedAnswers: { questionId: string; selectedOptionId: string | null; textAnswer?: string | null }[];
  timeTakenSec: number;
}) {
  const { attemptId, userId, submittedAnswers, timeTakenSec } = params;

  return db.$transaction(async (tx) => {
    const attempt = await tx.challengeAttempt.findUnique({
      where: { id: attemptId },
      include: { challenge: { include: { questions: { include: { options: true } } } } },
    });

    if (!attempt) throw new Error("Attempt not found");
    if (attempt.userId !== userId) throw new Error("Attempt does not belong to this user");
    if (attempt.status !== "in_progress") throw new Error("Attempt already submitted");

    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user?.level) throw new Error("User has no locked level");

    const multiplier = await getMultiplierForLevel(user.level as LevelKey);

    let correctCount = 0;
    let rawPoints = 0;

    for (const question of attempt.challenge.questions) {
      const submitted = submittedAnswers.find((a) => a.questionId === question.id);

      let isCorrect: boolean;
      if (question.type === "fill_blank") {
        const answerText = submitted?.textAnswer?.trim();
        isCorrect =
          !!answerText &&
          question.options.some((o) => o.isCorrect && normalizeText(o.text) === normalizeText(answerText));
      } else {
        const correctOption = question.options.find((o) => o.isCorrect);
        isCorrect = !!submitted?.selectedOptionId && submitted.selectedOptionId === correctOption?.id;
      }

      if (isCorrect) {
        correctCount += 1;
        rawPoints += question.points;
      }

      await tx.challengeAnswer.upsert({
        where: { attemptId_questionId: { attemptId, questionId: question.id } },
        create: {
          attemptId,
          questionId: question.id,
          selectedOptionId: submitted?.selectedOptionId ?? null,
          textAnswer: submitted?.textAnswer ?? null,
          isCorrect,
          pointsAwarded: isCorrect ? question.points : 0,
        },
        update: {
          selectedOptionId: submitted?.selectedOptionId ?? null,
          textAnswer: submitted?.textAnswer ?? null,
          isCorrect,
          pointsAwarded: isCorrect ? question.points : 0,
        },
      });
    }

    const finalPoints = Math.round(rawPoints * multiplier);

    const updatedAttempt = await tx.challengeAttempt.update({
      where: { id: attemptId },
      data: {
        status: "submitted",
        submittedAt: new Date(),
        timeTakenSec,
        correctCount,
        totalCount: attempt.challenge.questions.length,
        rawPoints,
        finalPoints,
      },
    });

    await tx.user.update({
      where: { id: userId },
      data: { totalPoints: { increment: finalPoints } },
    });

    return updatedAttempt;
  });
}
