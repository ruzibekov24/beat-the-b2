import { NextRequest, NextResponse } from "next/server";

const BOT_SECRET = process.env.BACKEND_BOT_SECRET;

/**
 * Guards endpoints intended to be called only by the Telegram bot service
 * (not by end users or the frontend). The bot sends this secret as a
 * header; it's a separate trust boundary from user JWT sessions and admin
 * sessions, and never exposed to the browser.
 */
export function requireBotSecret(req: NextRequest): NextResponse | null {
  if (!BOT_SECRET) {
    return NextResponse.json({ error: "Bot integration not configured" }, { status: 500 });
  }
  const header = req.headers.get("X-Bot-Secret");
  if (header !== BOT_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
