import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { requireBotSecret } from "@/lib/server/require-bot";

export async function GET(req: NextRequest) {
  const denied = requireBotSecret(req);
  if (denied) return denied;

  const telegramId = req.nextUrl.searchParams.get("telegram_id");
  if (!telegramId) return NextResponse.json({ error: "telegram_id required" }, { status: 400 });

  const user = await db.user.findUnique({ where: { telegramId }, select: { referralCode: true } });
  if (!user) return NextResponse.json({ error: "User not registered" }, { status: 404 });

  return NextResponse.json({ referralCode: user.referralCode });
}
