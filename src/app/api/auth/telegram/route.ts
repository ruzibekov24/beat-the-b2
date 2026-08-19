import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/server/db";
import { verifyTelegramAuth, setSessionCookie } from "@/lib/server/auth";
import { nanoid } from "@/lib/server/nanoid";
import { checkAndUnlockAchievements } from "@/lib/server/achievements";

const telegramAuthSchema = z.object({
  id: z.number(),
  first_name: z.string(),
  last_name: z.string().optional(),
  username: z.string().optional(),
  photo_url: z.string().optional(),
  auth_date: z.number(),
  hash: z.string(),
  referralCode: z.string().optional(), // ?ref=CODE captured client-side at landing
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = telegramAuthSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const payload = parsed.data;

  let verified = false;
  try {
    verified = verifyTelegramAuth(payload);
  } catch (e) {
    return NextResponse.json({ error: "Telegram auth not configured" }, { status: 500 });
  }

  if (!verified) {
    return NextResponse.json({ error: "Telegram identity verification failed" }, { status: 401 });
  }

  const telegramId = String(payload.id);

  let user = await db.user.findUnique({ where: { telegramId } });

  if (!user) {
    // Validate referral code (self-referral & bogus codes are rejected server-side)
    let referredById: string | null = null;
    if (payload.referralCode) {
      const referrer = await db.user.findUnique({ where: { referralCode: payload.referralCode } });
      if (referrer) referredById = referrer.id;
    }

    user = await db.user.create({
      data: {
        telegramId,
        telegramUsername: payload.username,
        firstName: payload.first_name,
        lastName: payload.last_name,
        photoUrl: payload.photo_url,
        name: payload.first_name,
        referralCode: nanoid(8),
        referredById,
      },
    });

    // Award referral points server-side, once, only for a genuinely new user
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
      await checkAndUnlockAchievements(referredById);
    }
  } else {
    // Keep profile info fresh on each login
    user = await db.user.update({
      where: { id: user.id },
      data: {
        telegramUsername: payload.username,
        firstName: payload.first_name,
        lastName: payload.last_name,
        photoUrl: payload.photo_url,
      },
    });
  }

  await setSessionCookie({ userId: user.id, telegramId: user.telegramId ?? undefined, isAdmin: user.isAdmin });

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      level: user.level,
      levelLocked: !!user.levelLockedAt,
    },
  });
}
