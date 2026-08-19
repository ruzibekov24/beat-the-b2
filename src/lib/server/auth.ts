import crypto from "crypto";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const SESSION_COOKIE = "b2_session";
const JWT_SECRET = process.env.JWT_SECRET as string;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN as string;

if (!JWT_SECRET && process.env.NODE_ENV !== "test") {
  // Fail loudly in dev rather than silently signing with `undefined`.
  console.warn("[auth] JWT_SECRET is not set — set it in .env before running the app.");
}

export interface TelegramAuthPayload {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

/**
 * Verifies the payload returned by the Telegram Login Widget.
 * This is the ONLY way a Telegram identity should be trusted —
 * never trust a client-submitted username without this check.
 * https://core.telegram.org/widgets/login#checking-authorization
 */
export function verifyTelegramAuth(payload: TelegramAuthPayload): boolean {
  if (!BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN is not configured");

  // Local-dev only: the onboarding demo form posts hash: "dev-bypass" instead
  // of a real Telegram-signed payload, since the Telegram Login Widget can't
  // run on localhost. Never allow this outside development.
  if (process.env.NODE_ENV !== "production" && payload.hash === "dev-bypass") {
    return true;
  }

  const { hash, ...rest } = payload;

  const dataCheckString = Object.keys(rest)
    .sort()
    .map((key) => `${key}=${(rest as Record<string, unknown>)[key]}`)
    .join("\n");

  const secretKey = crypto.createHash("sha256").update(BOT_TOKEN).digest();
  const computedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  const validHash = computedHash === hash;

  // Reject stale auth payloads (older than 24h) to limit replay window.
  const isFresh = Date.now() / 1000 - payload.auth_date < 60 * 60 * 24;

  return validHash && isFresh;
}

export interface SessionClaims {
  userId: string;
  telegramId?: string;
  isAdmin: boolean;
}

export function signSession(claims: SessionClaims): string {
  return jwt.sign(claims, JWT_SECRET, { expiresIn: "30d" });
}

export function verifySession(token: string): SessionClaims | null {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionClaims;
  } catch {
    return null;
  }
}

export async function setSessionCookie(claims: SessionClaims) {
  const token = signSession(claims);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function getSession(): Promise<SessionClaims | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

// ---- Admin session (separate cookie/secret so admin auth is isolated) ----

const ADMIN_COOKIE = "b2_admin_session";
export { ADMIN_COOKIE };

export interface AdminClaims {
  adminId: string;
  username: string;
}

export function signAdminSession(claims: AdminClaims): string {
  return jwt.sign(claims, JWT_SECRET, { expiresIn: "12h" });
}

export async function setAdminSessionCookie(claims: AdminClaims) {
  const token = signAdminSession(claims);
  const store = await cookies();
  store.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function getAdminSession(): Promise<AdminClaims | null> {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET) as AdminClaims;
  } catch {
    return null;
  }
}

export async function clearAdminSessionCookie() {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
}
