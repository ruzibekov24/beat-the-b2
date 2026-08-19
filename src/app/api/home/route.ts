import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { getSession } from "@/lib/server/auth";
import { CHALLENGE_DAY_TITLES } from "@/lib/levels";
import { getCurrentDay } from "@/lib/server/competition-day";

/**
 * Computes the current competition day from CompetitionSettings.startDate
 * and returns that day's challenges + missions from the DB.
 * Nothing here is hardcoded on the frontend — day content is 100% server-driven.
 */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const currentDay = await getCurrentDay();

  const challenges = await db.challenge.findMany({
    where: {
      day: currentDay,
      status: "published",
      OR: [{ level: null }, { level: user.level ?? undefined }],
    },
    select: {
      id: true,
      day: true,
      title: true,
      subtitle: true,
      type: true,
      description: true,
      level: true,
      basePoints: true,
      timeLimitSec: true,
      _count: { select: { questions: true } },
    },
  });

  const missions = await db.dailyMission.findMany({ where: { day: currentDay } });

  // Which of these challenges has the user already completed?
  const attempts = await db.challengeAttempt.findMany({
    where: { userId: user.id, challengeId: { in: challenges.map((c) => c.id) } },
    select: { challengeId: true, status: true, finalPoints: true },
  });

  const challengesWithStatus = challenges.map((c) => {
    const attempt = attempts.find((a) => a.challengeId === c.id);
    return {
      ...c,
      questionCount: c._count.questions,
      userStatus: attempt?.status ?? "not_started",
      earnedPoints: attempt?.status === "submitted" ? attempt.finalPoints : null,
    };
  });

  return NextResponse.json({
    currentDay,
    dayMeta: CHALLENGE_DAY_TITLES[currentDay] ?? null,
    level: user.level,
    levelLocked: !!user.levelLockedAt,
    challenges: challengesWithStatus,
    missions,
    dayStreak: user.dayStreak,
    wheelCanSpin: user.lastWheelSpinDay !== currentDay,
  });
}
