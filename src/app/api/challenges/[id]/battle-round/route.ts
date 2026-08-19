import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/server/db";
import { getSession } from "@/lib/server/auth";
import { simulateAiOpponent } from "@/lib/server/ai-opponent";
import type { LevelKey } from "@/lib/levels";

const schema = z.object({
  attemptId: z.string(),
  questionId: z.string(),
  selectedOptionId: z.string().nullable(),
  textAnswer: z.string().nullable().optional(),
});

function normalizeText(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Live AI Battle round reveal — checks one question's answer against both
 * the user's pick and the AI's precomputed answer for that question, so
 * the frontend can show a live "who won this round" reveal as the user
 * plays, instead of only comparing aggregate stats at the very end.
 *
 * Read-only: doesn't persist the user's answer (that still happens once,
 * atomically, via /submit at the end — this endpoint exists purely for
 * the live UI, not for scoring).
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: challengeId } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const attempt = await db.challengeAttempt.findUnique({ where: { id: parsed.data.attemptId } });
  if (!attempt || attempt.challengeId !== challengeId || attempt.userId !== session.userId) {
    return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
  }

  const challenge = await db.challenge.findUnique({
    where: { id: challengeId },
    include: { questions: { orderBy: { order: "asc" }, include: { options: true } } },
  });
  if (!challenge || challenge.type !== "ai_battle") {
    return NextResponse.json({ error: "Not an AI Battle challenge" }, { status: 400 });
  }

  const index = challenge.questions.findIndex((q) => q.id === parsed.data.questionId);
  if (index === -1) return NextResponse.json({ error: "Question not found" }, { status: 404 });

  const question = challenge.questions[index];

  let userCorrect: boolean;
  if (question.type === "fill_blank") {
    const answerText = parsed.data.textAnswer?.trim();
    userCorrect =
      !!answerText &&
      question.options.some((o) => o.isCorrect && normalizeText(o.text) === normalizeText(answerText));
  } else {
    const correctOption = question.options.find((o) => o.isCorrect);
    userCorrect = !!parsed.data.selectedOptionId && parsed.data.selectedOptionId === correctOption?.id;
  }

  let aiAnswers = attempt.aiAnswers as boolean[] | null;
  if (!aiAnswers) {
    const user = await db.user.findUnique({ where: { id: session.userId } });
    const opponent = await simulateAiOpponent(user!.level as LevelKey, challenge.questions.length, challenge.questions);
    aiAnswers = opponent.perQuestion;
    await db.challengeAttempt.update({ where: { id: attempt.id }, data: { aiAnswers } });
  }

  const aiCorrect = aiAnswers[index] ?? false;

  return NextResponse.json({ userCorrect, aiCorrect });
}
