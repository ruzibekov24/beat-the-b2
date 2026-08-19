import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { nanoid } from "@/lib/server/nanoid";

const BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;

/**
 * Starts a bot-based login: creates a short-lived pending token and returns
 * the t.me deep link the frontend should send the user to. The user taps
 * "Start" in Telegram, the bot picks up the token from the /start payload,
 * and confirms it via /api/auth/telegram-bot/confirm using the bot's own
 * authenticated identity — no widget, no SMS code involved.
 */
export async function POST(req: NextRequest) {
  if (!BOT_USERNAME) {
    return NextResponse.json({ error: "Telegram bot is not configured" }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const referralCode: string | undefined = body?.referralCode;

  const token = nanoid(24);

  await db.telegramLoginToken.create({
    data: { token, referralCode },
  });

  const deepLink = `https://t.me/${BOT_USERNAME}?start=${token}`;

  return NextResponse.json({ token, deepLink });
}
