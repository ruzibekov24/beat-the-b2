import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { getSession } from "@/lib/server/auth";
import { getCurrentDay } from "@/lib/server/competition-day";
import { WHEEL_PRIZES, pickWeightedPrizeIndex } from "@/lib/wheel";

/**
 * Wheel of Fortune — one spin per user per competition day. The outcome is
 * chosen here, server-side, using the shared weighted prize table; the
 * client only ever finds out the result after this call, never decides it
 * (same anti-cheat principle as everywhere else — no client-trusted scores).
 */
export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (!user.levelLockedAt) {
    return NextResponse.json({ error: "Lock a level before spinning" }, { status: 403 });
  }

  const currentDay = await getCurrentDay();
  if (user.lastWheelSpinDay === currentDay) {
    return NextResponse.json({ error: "Already spun today" }, { status: 409 });
  }

  const prizeIndex = pickWeightedPrizeIndex();
  const prize = WHEEL_PRIZES[prizeIndex];

  await db.user.update({
    where: { id: user.id },
    data: {
      lastWheelSpinDay: currentDay,
      totalPoints: { increment: prize.points },
    },
  });

  return NextResponse.json({ prizeIndex, label: prize.label, points: prize.points });
}
