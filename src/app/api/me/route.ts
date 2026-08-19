import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { getSession } from "@/lib/server/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ user: null }, { status: 200 });

  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user) return NextResponse.json({ user: null }, { status: 200 });

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      telegramUsername: user.telegramUsername,
      photoUrl: user.photoUrl,
      level: user.level,
      levelLocked: !!user.levelLockedAt,
      totalPoints: user.totalPoints,
      dayStreak: user.dayStreak,
      referralCode: user.referralCode,
    },
  });
}
