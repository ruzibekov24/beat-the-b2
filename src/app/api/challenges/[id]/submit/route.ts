import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/server/db";
import { getSession } from "@/lib/server/auth";
import { gradeAttempt } from "@/lib/server/scoring";
import { checkAndUnlockAchievements } from "@/lib/server/achievements";
import { simulateAiOpponent } from "@/lib/server/ai-opponent";

const schema = z.object({
  attemptId: z.string(),
  timeTakenSec: z.number().int().min(0),
  answers: z.array(
    z.object({
      questionId: z.string(),
      selectedOptionId: z.string().nullable(),
      textAnswer: z.string().nullable().optional(),
    })
  ),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: challengeId } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid submission" }, { status: 400 });

  const attempt = await db.challengeAttempt.findUnique({ where: { id: parsed.data.attemptId } });
  if (!attempt || attempt.challengeId !== challengeId) {
    return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
  }

  try {
    const graded = await gradeAttempt({
      attemptId: parsed.data.attemptId,
      userId: session.userId,
      submittedAnswers: parsed.data.answers,
      timeTakenSec: parsed.data.timeTakenSec,
    });

    await checkAndUnlockAchievements(session.userId);

    // Recompute global rank for the result screen
    const rank =
      (await db.user.count({
        where: { totalPoints: { gt: (await db.user.findUnique({ where: { id: session.userId } }))!.totalPoints } },
      })) + 1;

    // For AI Battle challenges, generate the opponent's result at the same
    // level so the frontend can render a head-to-head comparison.
    let opponent = null;
    const challenge = await db.challenge.findUnique({
      where: { id: challengeId },
      include: { questions: { select: { prompt: true }, orderBy: { order: "asc" } } },
    });
    const user = await db.user.findUnique({ where: { id: session.userId } });
    if (challenge?.type === "ai_battle" && user?.level) {
      opponent = await simulateAiOpponent(
        user.level as import("@/lib/levels").LevelKey,
        graded.totalCount,
        challenge.questions
      );
    }

    return NextResponse.json({
      correctCount: graded.correctCount,
      totalCount: graded.totalCount,
      accuracy: graded.totalCount > 0 ? Math.round((graded.correctCount / graded.totalCount) * 100) : 0,
      finalPoints: graded.finalPoints,
      timeTakenSec: graded.timeTakenSec,
      rank,
      opponent,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Grading failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
