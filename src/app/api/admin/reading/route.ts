import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/server/db";
import { requireAdmin } from "@/lib/server/require-admin";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const materials = await db.readingMaterial.findMany({
    orderBy: { createdAt: "desc" },
    include: { challenge: { select: { id: true } } },
  });
  return NextResponse.json({ materials });
}

const schema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  level: z.enum(["A1_A2", "B1", "B2", "C1"]),
  timeLimitSec: z.number().int().min(1).nullable().optional(),
  isPublished: z.boolean().default(false),
  isDemo: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid data", issues: parsed.error.issues }, { status: 400 });

  const material = await db.readingMaterial.create({ data: parsed.data });
  return NextResponse.json({ material }, { status: 201 });
}
