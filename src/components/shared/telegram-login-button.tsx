"use client";

import { useEffect, useRef } from "react";

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

declare global {
  interface Window {
    onTelegramAuth?: (user: TelegramUser) => void;
  }
}

/**
 * Renders the real Telegram Login Widget. Telegram injects a button/iframe
 * into this container once the script loads, and calls window.onTelegramAuth
 * with a signed payload after the user approves the login inside Telegram.
 *
 * Requirements for this to work:
 * - The bot must have its domain set via @BotFather -> /setdomain
 *   (must match the origin this page is served from, incl. https://)
 * - NEXT_PUBLIC_TELEGRAM_BOT_USERNAME must be set (no @ prefix)
 */
export function TelegramLoginButton({
  onAuth,
  botUsername,
}: {
  onAuth: (user: TelegramUser) => void;
  botUsername: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.onTelegramAuth = onAuth;

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "0");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    script.setAttribute("data-request-access", "write");

    containerRef.current?.appendChild(script);

    return () => {
      delete window.onTelegramAuth;
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, [onAuth, botUsername]);

  return <div ref={containerRef} className="flex justify-center" />;
}
