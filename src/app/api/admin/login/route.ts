import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/server/db";
import { signAdminSession, ADMIN_COOKIE } from "@/lib/server/auth";

const schema = z.object({ username: z.string(), password: z.string() });

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const admin = await db.adminUser.findUnique({ where: { username: parsed.data.username } });
  if (!admin) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

  const valid = await bcrypt.compare(parsed.data.password, admin.passwordHash);
  if (!valid) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

  const token = signAdminSession({ adminId: admin.id, username: admin.username });

  // Set the cookie directly on the response object rather than via
  // next/headers cookies() — this is the most reliable way to guarantee
  // the Set-Cookie header lands on this exact response.
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });

  return res;
}
