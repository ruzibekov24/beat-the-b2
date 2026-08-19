import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/server/db";
import { requireBotSecret } from "@/lib/server/require-bot";

const schema = z.object({
  token: z.string(),
  telegramId: z.string(),
  telegramUsername: z.string().nullable().optional(),
  firstName: z.string(),
  lastName: z.string().nullable().optional(),
  photoUrl: z.string().nullable().optional(),
});

/**
 * Called only by the Telegram bot service (see /telegram-bot/bot.py) the
 * instant a user taps "Start" on the login deep link. Telegram guarantees
 * the bot receives the user's real telegram_id/username/name for any user
 * who messages it — this is the same trust boundary as the Login Widget,
 * just routed through the bot instead of the oauth.telegram.org widget
 * (which has a known, long-standing delivery bug).
 */
export async function POST(req: NextRequest) {
  const denied = requireBotSecret(req);
  if (denied) return denied;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });
  }

  const { token, ...identity } = parsed.data;

  const record = await db.telegramLoginToken.findUnique({ where: { token } });
  if (!record) return NextResponse.json({ error: "Unknown or expired token" }, { status: 404 });

  await db.telegramLoginToken.update({
    where: { token },
    data: {
      status: "confirmed",
      telegramId: identity.telegramId,
      telegramUsername: identity.telegramUsername,
      firstName: identity.firstName,
      lastName: identity.lastName,
      photoUrl: identity.photoUrl,
      confirmedAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}
