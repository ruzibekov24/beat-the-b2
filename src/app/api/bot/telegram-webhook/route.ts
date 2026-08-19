import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { sendTelegramMessage, inlineButtonKeyboard } from "@/lib/server/telegram";

const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;
const BOT_SECRET = process.env.BACKEND_BOT_SECRET;
const BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;

interface TelegramFrom {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
}

/**
 * Telegram webhook endpoint — replaces the long-polling telegram-bot/bot.py
 * process for production. Runs inside the same Vercel deployment as the
 * rest of the app, so it's free and always-on with no separate hosting.
 * Registered via Telegram's setWebhook API pointing at this route.
 */
export async function POST(req: NextRequest) {
  if (WEBHOOK_SECRET) {
    const header = req.headers.get("x-telegram-bot-api-secret-token");
    if (header !== WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const update = await req.json().catch(() => null);
  const message = update?.message;
  if (!message?.chat?.id) return NextResponse.json({ ok: true });

  const chatId: number = message.chat.id;
  const user: TelegramFrom = message.from ?? { id: chatId };
  const text: string = message.text ?? "";
  const origin = req.nextUrl.origin;

  try {
    if (text.startsWith("/start")) {
      const parts = text.split(/\s+/);
      const payload = parts.length > 1 ? parts[1] : undefined;
      await handleStart(chatId, user, payload, origin);
    } else if (text === "/leaderboard") {
      await handleLeaderboard(chatId);
    } else if (text === "/referral") {
      await handleReferral(chatId, user);
    }
  } catch (err) {
    console.error("telegram-webhook error", err);
  }

  return NextResponse.json({ ok: true });
}

// A login token is nanoid(24); a referral code is nanoid(8) — same
// length-based distinction bot.py used.
async function handleStart(chatId: number, user: TelegramFrom, payload: string | undefined, origin: string) {
  if (payload && payload.length >= 20) {
    await handleLoginConfirmation(chatId, user, payload, origin);
    return;
  }

  const link = payload ? `${origin}/join/${payload}` : `${origin}/onboarding`;
  await sendTelegramMessage(
    chatId,
    "🔥 <b>CAN YOU BEAT THE B2?</b>\n\n" +
      "7 days. One champion. Choose your level, lock it, and prove it.\n\n" +
      "Tap below to get started.",
    inlineButtonKeyboard([{ label: "🚀 Start the challenge", url: link }])
  );
}

async function handleLoginConfirmation(chatId: number, user: TelegramFrom, token: string, origin: string) {
  try {
    const res = await fetch(`${origin}/api/auth/telegram-bot/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Bot-Secret": BOT_SECRET ?? "" },
      body: JSON.stringify({
        token,
        telegramId: String(user.id),
        telegramUsername: user.username ?? null,
        firstName: user.first_name || "Player",
        lastName: user.last_name ?? null,
      }),
    });

    if (res.status === 404) {
      await sendTelegramMessage(chatId, "⚠️ This login link has expired. Please go back to the site and try again.");
      return;
    }
    if (!res.ok) {
      await sendTelegramMessage(chatId, "⚠️ Something went wrong confirming your login. Please try again.");
      return;
    }
    await sendTelegramMessage(
      chatId,
      "✅ <b>You're logged in!</b>\n\nGo back to the browser tab — it should continue automatically."
    );
  } catch {
    await sendTelegramMessage(chatId, "⚠️ Couldn't reach the server. Please try logging in again from the site.");
  }
}

async function handleLeaderboard(chatId: number) {
  const users = await db.user.findMany({
    where: { levelLockedAt: { not: null } },
    orderBy: { totalPoints: "desc" },
    take: 5,
    select: { name: true, totalPoints: true },
  });

  if (users.length === 0) {
    await sendTelegramMessage(chatId, "No competitors yet. Be the first!");
    return;
  }

  const medals = ["🥇", "🥈", "🥉"];
  const lines = ["🏆 <b>Top 5 right now</b>\n"];
  users.forEach((u, i) => {
    const medal = i < 3 ? medals[i] : `#${i + 1}`;
    lines.push(`${medal} ${u.name} — ${u.totalPoints} XP`);
  });
  await sendTelegramMessage(chatId, lines.join("\n"));
}

async function handleReferral(chatId: number, user: TelegramFrom) {
  const dbUser = await db.user.findUnique({
    where: { telegramId: String(user.id) },
    select: { referralCode: true },
  });

  if (!dbUser || !BOT_USERNAME) {
    await sendTelegramMessage(chatId, "Register on the web app first, then come back for your referral link.");
    return;
  }

  const deepLink = `https://t.me/${BOT_USERNAME}?start=${dbUser.referralCode}`;
  await sendTelegramMessage(
    chatId,
    `👥 <b>Your referral link:</b>\n${deepLink}\n\nYou earn points for every verified friend who joins.`
  );
}
