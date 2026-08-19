import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { requireAdmin } from "@/lib/server/require-admin";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const topReferrers = await db.user.findMany({
    where: { referrals: { some: {} } },
    orderBy: { referrals: { _count: "desc" } },
    take: 50,
    select: {
      id: true,
      name: true,
      telegramUsername: true,
      referralCode: true,
      _count: { select: { referrals: true } },
      referralRewards: { select: { points: true } },
    },
  });

  const totalRewards = await db.referralReward.count();

  return NextResponse.json({
    totalRewards,
    topReferrers: topReferrers.map((u) => ({
      id: u.id,
      name: u.name,
      telegramUsername: u.telegramUsername,
      referralCode: u.referralCode,
      friendsInvited: u._count.referrals,
      referralPoints: u.referralRewards.reduce((s, r) => s + r.points, 0),
    })),
  });
}
