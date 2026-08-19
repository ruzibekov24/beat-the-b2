import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { getSession } from "@/lib/server/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const user = await db.user.findUnique({
    where: { id: session.userId },
    include: {
      achievements: { include: { achievement: true } },
      referrals: { select: { id: true } },
      referralRewards: true,
    },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const attempts = await db.challengeAttempt.findMany({
    where: { userId: user.id, status: "submitted" },
  });

  const totalCorrect = attempts.reduce((sum, a) => sum + a.correctCount, 0);
  const totalQuestions = attempts.reduce((sum, a) => sum + a.totalCount, 0);
  const accuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

  const rank =
    (await db.user.count({ where: { totalPoints: { gt: user.totalPoints } } })) + 1;

  return NextResponse.json({
    name: user.name,
    telegramUsername: user.telegramUsername,
    photoUrl: user.photoUrl,
    level: user.level,
    levelLocked: !!user.levelLockedAt,
    stats: {
      totalPoints: user.totalPoints,
      globalRank: rank,
      accuracy,
      challengesCompleted: attempts.length,
      dayStreak: user.dayStreak,
    },
    achievements: user.achievements.map((ua) => ({
      key: ua.achievement.key,
      title: ua.achievement.title,
      icon: ua.achievement.icon,
      unlockedAt: ua.unlockedAt,
    })),
    referral: {
      code: user.referralCode,
      friendsInvited: user.referrals.length,
      referralPoints: user.referralRewards.reduce((sum, r) => sum + r.points, 0),
    },
  });
}
