import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { setSessionCookie } from "@/lib/server/auth";
import { nanoid } from "@/lib/server/nanoid";

/**
 * Polled by the frontend every couple seconds while the user is in Telegram
 * confirming the login. Once the bot has confirmed the token (see
 * /api/auth/telegram-bot/confirm), this creates/finds the user, sets the
 * session cookie, and tells the frontend where to go next.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "token is required" }, { status: 400 });

  const record = await db.telegramLoginToken.findUnique({ where: { token } });
  if (!record) return NextResponse.json({ status: "expired" });

  // Tokens are only valid for 10 minutes.
  const ageMs = Date.now() - record.createdAt.getTime();
  if (ageMs > 10 * 60 * 1000) {
    return NextResponse.json({ status: "expired" });
  }

  if (record.status === "pending") {
    return NextResponse.json({ status: "pending" });
  }

  if (record.status !== "confirmed" || !record.telegramId) {
    return NextResponse.json({ status: "expired" });
  }

  let user = await db.user.findUnique({ where: { telegramId: record.telegramId } });

  if (!user) {
    let referredById: string | null = null;
    if (record.referralCode) {
      const referrer = await db.user.findUnique({ where: { referralCode: record.referralCode } });
      if (referrer) referredById = referrer.id;
    }

    user = await db.user.create({
      data: {
        telegramId: record.telegramId,
        telegramUsername: record.telegramUsername,
        firstName: record.firstName ?? "Player",
        lastName: record.lastName,
        photoUrl: record.photoUrl,
        name: record.firstName ?? "Player",
        referralCode: nanoid(8),
        referredById,
      },
    });

    if (referredById) {
      await db.$transaction([
        db.referralReward.create({
          data: { referrerId: referredById, newUserId: user.id, points: 10 },
        }),
        db.user.update({
          where: { id: referredById },
          data: { totalPoints: { increment: 10 } },
        }),
      ]);
    }
  }

  await setSessionCookie({ userId: user.id, telegramId: user.telegramId ?? undefined, isAdmin: user.isAdmin });

  // One-time use — clean up the token now that login is complete.
  await db.telegramLoginToken.delete({ where: { token } });

  return NextResponse.json({
    status: "confirmed",
    redirectTo: user.levelLockedAt ? "/home" : "/onboarding/level",
  });
}
