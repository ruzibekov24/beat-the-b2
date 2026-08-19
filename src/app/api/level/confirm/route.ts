import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/server/db";
import { getSession } from "@/lib/server/auth";

const schema = z.object({
  level: z.enum(["A1_A2", "B1", "B2", "C1"]),
});

// This is the ONLY endpoint that permanently locks a level. It is called
// after the UI's two-step confirmation flow completes. The lock is
// enforced here — not in the frontend — and is irreversible by design:
// once levelLockedAt is set, no other endpoint will allow changing `level`.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid level" }, { status: 400 });

  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (user.levelLockedAt) {
    return NextResponse.json(
      { error: "Level already locked", level: user.level },
      { status: 409 }
    );
  }

  const updated = await db.user.update({
    where: { id: user.id },
    data: {
      level: parsed.data.level,
      levelLockedAt: new Date(),
    },
  });

  return NextResponse.json({
    ok: true,
    level: updated.level,
    lockedAt: updated.levelLockedAt,
  });
}
