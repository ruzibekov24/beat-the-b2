import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/server/require-admin";

const schema = z.object({
  telegramIds: z.array(z.string()).min(1),
  message: z.string().min(1),
});

const BOT_SERVICE_URL = process.env.BOT_SERVICE_URL; // e.g. http://telegram-bot:8081
const BOT_SERVICE_SECRET = process.env.BACKEND_BOT_SECRET;

/**
 * Admin-triggered broadcast (e.g. "Day 3 challenge is live!"). This route
 * forwards the request to the bot service's internal HTTP endpoint, which
 * is responsible for actually calling the Telegram Bot API to send
 * messages. Keeping this indirection means the Next.js backend never
 * needs the raw bot token.
 */
export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  if (!BOT_SERVICE_URL) {
    return NextResponse.json({ error: "Bot service not configured" }, { status: 500 });
  }

  try {
    const res = await fetch(`${BOT_SERVICE_URL}/notify`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Bot-Secret": BOT_SERVICE_SECRET ?? "" },
      body: JSON.stringify(parsed.data),
    });
    if (!res.ok) {
      return NextResponse.json({ error: "Bot service rejected the notification" }, { status: 502 });
    }
  } catch {
    return NextResponse.json({ error: "Could not reach bot service" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
