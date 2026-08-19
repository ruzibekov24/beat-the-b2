const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

/**
 * Thin wrapper around the Telegram Bot API, used by both the webhook
 * handler (bot/telegram-webhook) and the admin broadcast route (bot/notify).
 * Runs entirely server-side inside Vercel's serverless functions — no
 * separate always-on bot process is needed for this to work.
 */
export async function sendTelegramMessage(
  chatId: number | string,
  text: string,
  replyMarkup?: unknown
): Promise<void> {
  if (!BOT_TOKEN) return;
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", reply_markup: replyMarkup }),
  });
}

export function inlineButtonKeyboard(buttons: Array<{ label: string; url: string }>) {
  return { inline_keyboard: buttons.map(({ label, url }) => [{ text: label, url }]) };
}
