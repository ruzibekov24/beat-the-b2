import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { exchangeGoogleCode } from "@/lib/server/google-auth";
import { signSession } from "@/lib/server/auth";
import { nanoid } from "@/lib/server/nanoid";

const STATE_COOKIE = "b2_oauth_state";
const REF_COOKIE = "b2_oauth_ref";
const SESSION_COOKIE = "b2_session";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const storedState = req.cookies.get(STATE_COOKIE)?.value;
  const referralCode = req.cookies.get(REF_COOKIE)?.value;

  if (!code || !state || !storedState || state !== storedState) {
    return NextResponse.redirect(new URL("/onboarding?error=oauth_state", req.url));
  }

  let googleUser;
  try {
    googleUser = await exchangeGoogleCode(code);
  } catch {
    return NextResponse.redirect(new URL("/onboarding?error=google_failed", req.url));
  }

  if (!googleUser.email_verified) {
    return NextResponse.redirect(new URL("/onboarding?error=email_unverified", req.url));
  }

  let user = await db.user.findUnique({ where: { googleId: googleUser.sub } });

  if (!user) {
    // Also check by email in case this person already has an account via
    // another method — link the Google identity rather than creating a dup.
    user = await db.user.findUnique({ where: { email: googleUser.email } });
  }

  if (!user) {
    let referredById: string | null = null;
    if (referralCode) {
      const referrer = await db.user.findUnique({ where: { referralCode } });
      if (referrer) referredById = referrer.id;
    }

    user = await db.user.create({
      data: {
        googleId: googleUser.sub,
        email: googleUser.email,
        firstName: googleUser.given_name ?? googleUser.name,
        lastName: googleUser.family_name,
        photoUrl: googleUser.picture,
        name: googleUser.name,
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
  } else if (!user.googleId) {
    // Link Google identity to an existing account found by email.
    user = await db.user.update({
      where: { id: user.id },
      data: { googleId: googleUser.sub, photoUrl: user.photoUrl ?? googleUser.picture },
    });
  }

  const token = signSession({ userId: user.id, telegramId: user.telegramId ?? "", isAdmin: user.isAdmin });

  const destination = user.levelLockedAt ? "/home" : "/onboarding/level";
  const res = NextResponse.redirect(new URL(destination, req.url));

  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  res.cookies.delete(STATE_COOKIE);
  res.cookies.delete(REF_COOKIE);

  return res;
}
