import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { getSession } from "@/lib/server/auth";

/**
 * Starts (or resumes) an attempt for a challenge.
 * Returns questions WITHOUT the isCorrect flag on options — the frontend
 * never receives correct answers, so answer validation must round-trip
 * through /submit.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: challengeId } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user?.level || !user.levelLockedAt) {
    return NextResponse.json({ error: "Lock a level before starting a challenge" }, { status: 403 });
  }

  const challenge = await db.challenge.findUnique({
    where: { id: challengeId },
    include: { questions: { orderBy: { order: "asc" }, include: { options: true } } },
  });

  if (!challenge || challenge.status !== "published") {
    return NextResponse.json({ error: "Challenge not available" }, { status: 404 });
  }

  if (challenge.level && challenge.level !== user.level) {
    return NextResponse.json({ error: "This challenge is not for your level" }, { status: 403 });
  }

  // Prevent duplicate submissions: block starting a new attempt if a
  // submitted one already exists and maxAttempts has been reached.
  const existingAttempts = await db.challengeAttempt.findMany({
    where: { userId: user.id, challengeId },
  });

  const submittedCount = existingAttempts.filter((a) => a.status === "submitted").length;
  if (submittedCount >= challenge.maxAttempts) {
    return NextResponse.json({ error: "Max attempts reached for this challenge" }, { status: 409 });
  }

  let attempt = existingAttempts.find((a) => a.status === "in_progress");
  if (!attempt) {
    attempt = await db.challengeAttempt.create({
      data: { userId: user.id, challengeId, totalCount: challenge.questions.length },
    });
  }

  return NextResponse.json({
    attemptId: attempt.id,
    challenge: {
      id: challenge.id,
      day: challenge.day,
      title: challenge.title,
      subtitle: challenge.subtitle,
      type: challenge.type,
      timeLimitSec: challenge.timeLimitSec,
    },
    questions: challenge.questions.map((q) => ({
      id: q.id,
      order: q.order,
      type: q.type,
      prompt: q.prompt,
      timeLimitSec: q.timeLimitSec,
      // isCorrect intentionally stripped before reaching the client. For
      // fill_blank, options ARE the accepted answers with no decoys, so
      // the whole array is withheld too — sending it would just be the
      // answer key with one field removed.
      options: q.type === "fill_blank" ? [] : q.options.map((o) => ({ id: o.id, label: o.label, text: o.text })),
    })),
  });
}
