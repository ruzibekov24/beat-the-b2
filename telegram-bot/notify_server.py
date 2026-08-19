"""
Small internal HTTP server the bot service exposes so the Next.js backend
can request outbound Telegram notifications (e.g. "Day 3 is live").
Runs alongside bot.py's polling loop, as a separate process. Not exposed
publicly — only the backend should be able to reach this (keep it on an
internal network or behind a firewall in production).

Uses only the standard library's http.server + requests — no aiohttp, so
it works on any Python version without native-extension build issues.

Run with: python notify_server.py
"""

import os
import json
import requests
from http.server import BaseHTTPRequestHandler, HTTPServer
from dotenv import load_dotenv

load_dotenv()

BOT_TOKEN = os.environ["BOT_TOKEN"]
BACKEND_BOT_SECRET = os.environ.get("BACKEND_BOT_SECRET", "")
API_BASE = f"https://api.telegram.org/bot{BOT_TOKEN}"


class NotifyHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path != "/notify":
            self.send_response(404)
            self.end_headers()
            return

        if self.headers.get("X-Bot-Secret") != BACKEND_BOT_SECRET:
            self._json_response(401, {"error": "Unauthorized"})
            return

        length = int(self.headers.get("Content-Length", 0))
        body = json.loads(self.rfile.read(length) or b"{}")

        telegram_ids = body.get("telegramIds", [])
        message = body.get("message", "")

        if not telegram_ids or not message:
            self._json_response(400, {"error": "telegramIds and message are required"})
            return

        sent, failed = 0, 0
        for tid in telegram_ids:
            try:
                resp = requests.post(
                    f"{API_BASE}/sendMessage",
                    json={"chat_id": int(tid), "text": message, "parse_mode": "HTML"},
                    timeout=10,
                )
                if resp.ok:
                    sent += 1
                else:
                    failed += 1
            except requests.RequestException:
                failed += 1

        self._json_response(200, {"sent": sent, "failed": failed})

    def _json_response(self, status, data):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def log_message(self, format, *args):
        pass  # keep stdout quiet; rely on the main bot.py logs


if __name__ == "__main__":
    port = int(os.environ.get("NOTIFY_PORT", 8081))
    server = HTTPServer(("0.0.0.0", port), NotifyHandler)
    print(f"Notify server listening on port {port}")
    server.serve_forever()
