import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { requireAdmin } from "@/lib/server/require-admin";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const [totalUsers, lockedUsers, totalAttempts, totalChallenges, publishedChallenges, totalReferrals, levelCounts] =
    await Promise.all([
      db.user.count(),
      db.user.count({ where: { levelLockedAt: { not: null } } }),
      db.challengeAttempt.count({ where: { status: "submitted" } }),
      db.challenge.count(),
      db.challenge.count({ where: { status: "published" } }),
      db.referralReward.count(),
      db.user.groupBy({ by: ["level"], _count: true, where: { levelLockedAt: { not: null } } }),
    ]);

  return NextResponse.json({
    totalUsers,
    lockedUsers,
    totalAttempts,
    totalChallenges,
    publishedChallenges,
    totalReferrals,
    levelCounts,
  });
}
