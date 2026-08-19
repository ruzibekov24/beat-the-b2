import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/server/db";
import { requireAdmin } from "@/lib/server/require-admin";

const schema = z.object({ day: z.number().int().min(1).max(7) });

/**
 * Returns the Challenge already linked to this reading material, or
 * creates one (day/level/type inferred, still a draft) so the admin can
 * jump straight to adding questions instead of hand-wiring a Challenge
 * through the separate Challenges tab first.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid day" }, { status: 400 });

  const material = await db.readingMaterial.findUnique({
    where: { id },
    include: { challenge: { select: { id: true } } },
  });
  if (!material) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (material.challenge) {
    return NextResponse.json({ challengeId: material.challenge.id });
  }

  const challenge = await db.challenge.create({
    data: {
      day: parsed.data.day,
      title: material.title,
      type: "reading",
      level: material.level,
      readingId: material.id,
      status: "draft",
    },
  });

  return NextResponse.json({ challengeId: challenge.id }, { status: 201 });
}
