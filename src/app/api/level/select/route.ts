import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/server/db";
import { getSession } from "@/lib/server/auth";

const schema = z.object({
  level: z.enum(["A1_A2", "B1", "B2", "C1"]),
});

// This endpoint is intentionally a no-op on the DB: selecting a level is a
// UI-only staging step. Nothing is persisted (and therefore nothing is
// "locked") until /api/level/confirm is called. This keeps accidental
// taps free of any server-side side effects.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid level" }, { status: 400 });

  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (user?.levelLockedAt) {
    return NextResponse.json({ error: "Level is already locked" }, { status: 409 });
  }

  return NextResponse.json({ ok: true, level: parsed.data.level });
}
