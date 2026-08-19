"""
Can You Beat The B2? — Telegram Bot (dependency-light version)

Uses the Telegram Bot API directly via long polling and the `requests`
library — no aiogram/pydantic-core, so it works on any Python version
(including very new ones like 3.14) without native-extension build issues.

This bot is a thin notification/entry-point layer. It is NOT the
application backend — all state (users, levels, scores, challenges)
lives in the Next.js backend's PostgreSQL database, accessed only
through the backend's HTTP API. The bot never touches the database
directly.

Run with: python bot.py
Requires: BOT_TOKEN, BACKEND_URL, BACKEND_BOT_SECRET in .env
"""

import os
import time
import logging

import requests
from dotenv import load_dotenv

load_dotenv()

BOT_TOKEN = os.environ["BOT_TOKEN"]
BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:3000")
BACKEND_BOT_SECRET = os.environ.get("BACKEND_BOT_SECRET", "")
WEBAPP_URL = os.environ.get("WEBAPP_URL", "http://localhost:3000")

API_BASE = f"https://api.telegram.org/bot{BOT_TOKEN}"

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def api_call(method, **params):
    resp = requests.post(f"{API_BASE}/{method}", json=params, timeout=15)
    resp.raise_for_status()
    return resp.json()


def send_message(chat_id, text, reply_markup=None):
    payload = {"chat_id": chat_id, "text": text, "parse_mode": "HTML"}
    if reply_markup:
        payload["reply_markup"] = reply_markup
    return api_call("sendMessage", **payload)


def inline_button_keyboard(buttons):
    """buttons: list of (label, url) pairs, one per row."""
    return {"inline_keyboard": [[{"text": label, "url": url}] for label, url in buttons]}


def handle_start(chat_id, user, payload):
    """
    /start — handles three cases based on the deep-link payload:
    1. A login token (24-char, from "Continue with Telegram" on the site) —
       confirm it with the backend so the waiting browser tab picks up the
       login via polling.
    2. A referral code (8-char, shared by another user) — forward the user
       into onboarding with that code attached.
    3. No payload — plain welcome message.
    """
    if payload and len(payload) >= 20:
        handle_login_confirmation(chat_id, user, payload)
        return

    link = f"{WEBAPP_URL}/onboarding"
    if payload:
        link = f"{WEBAPP_URL}/join/{payload}"

    send_message(
        chat_id,
        "🔥 <b>CAN YOU BEAT THE B2?</b>\n\n"
        "7 days. One champion. Choose your level, lock it, and prove it.\n\n"
        "Tap below to get started.",
        reply_markup=inline_button_keyboard([("🚀 Start the challenge", link)]),
    )


def handle_login_confirmation(chat_id, user, token):
    """
    Confirms a pending web login token using this chat's real, Telegram-
    verified identity. Telegram guarantees `user` reflects the actual
    account messaging the bot, so this is the trust boundary that replaces
    the oauth.telegram.org widget — no separate code delivery step needed.
    """
    try:
        resp = requests.post(
            f"{BACKEND_URL}/api/auth/telegram-bot/confirm",
            json={
                "token": token,
                "telegramId": str(user["id"]),
                "telegramUsername": user.get("username"),
                "firstName": user.get("first_name") or "Player",
                "lastName": user.get("last_name"),
            },
            headers={"X-Bot-Secret": BACKEND_BOT_SECRET},
            timeout=10,
        )
    except requests.RequestException:
        send_message(chat_id, "⚠️ Couldn't reach the server. Please try logging in again from the site.")
        return

    if resp.status_code == 404:
        send_message(chat_id, "⚠️ This login link has expired. Please go back to the site and try again.")
        return
    if not resp.ok:
        send_message(chat_id, "⚠️ Something went wrong confirming your login. Please try again.")
        return

    send_message(chat_id, "✅ <b>You're logged in!</b>\n\nGo back to the browser tab — it should continue automatically.")


def handle_leaderboard(chat_id):
    try:
        resp = requests.get(f"{BACKEND_URL}/api/leaderboard", timeout=10)
        resp.raise_for_status()
        rows = resp.json().get("rows", [])[:5]
    except requests.RequestException:
        send_message(chat_id, "Couldn't reach the leaderboard right now — try again shortly.")
        return

    if not rows:
        send_message(chat_id, "No competitors yet. Be the first!")
        return

    medals = ["🥇", "🥈", "🥉"]
    lines = ["🏆 <b>Top 5 right now</b>\n"]
    for row in rows:
        medal = medals[row["rank"] - 1] if row["rank"] <= 3 else f"#{row['rank']}"
        lines.append(f"{medal} {row['name']} — {row['totalPoints']} XP")

    send_message(chat_id, "\n".join(lines))


def handle_referral(chat_id, user):
    try:
        resp = requests.get(
            f"{BACKEND_URL}/api/bot/referral-code",
            params={"telegram_id": user["id"]},
            headers={"X-Bot-Secret": BACKEND_BOT_SECRET},
            timeout=10,
        )
        resp.raise_for_status()
        code = resp.json().get("referralCode")
    except requests.RequestException:
        send_message(chat_id, "Register on the web app first, then come back for your referral link.")
        return

    me = api_call("getMe")
    bot_username = me["result"]["username"]
    deep_link = f"https://t.me/{bot_username}?start={code}"
    send_message(
        chat_id,
        f"👥 <b>Your referral link:</b>\n{deep_link}\n\nYou earn points for every verified friend who joins.",
    )


def process_update(update):
    message = update.get("message")
    if not message:
        return

    chat_id = message["chat"]["id"]
    user = message.get("from", {})
    text = message.get("text", "")

    if text.startswith("/start"):
        parts = text.split(maxsplit=1)
        payload = parts[1] if len(parts) > 1 else None
        handle_start(chat_id, user, payload)
    elif text == "/leaderboard":
        handle_leaderboard(chat_id)
    elif text == "/referral":
        handle_referral(chat_id, user)


def main():
    logger.info("Starting Can You Beat The B2? bot (polling)…")
    offset = 0
    while True:
        try:
            resp = requests.get(
                f"{API_BASE}/getUpdates",
                params={"offset": offset, "timeout": 30},
                timeout=40,
            )
            resp.raise_for_status()
            data = resp.json()
        except requests.RequestException as e:
            logger.warning("Polling error: %s — retrying in 3s", e)
            time.sleep(3)
            continue

        for update in data.get("result", []):
            offset = update["update_id"] + 1
            try:
                process_update(update)
            except Exception:
                logger.exception("Error handling update")


if __name__ == "__main__":
    main()
