import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/server/require-admin";
import { sendTelegramMessage } from "@/lib/server/telegram";

const schema = z.object({
  telegramIds: z.array(z.string()).min(1),
  message: z.string().min(1),
});

/**
 * Admin-triggered broadcast (e.g. "Day 3 challenge is live!"). Sends
 * directly via the Telegram Bot API — no separate always-on bot service
 * needed, since the bot itself now runs as a webhook inside this same
 * Vercel deployment (see api/bot/telegram-webhook).
 */
export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  await Promise.all(
    parsed.data.telegramIds.map((chatId) => sendTelegramMessage(chatId, parsed.data.message))
  );

  return NextResponse.json({ ok: true });
}
