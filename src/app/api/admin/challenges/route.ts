import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/server/db";
import { requireAdmin } from "@/lib/server/require-admin";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const challenges = await db.challenge.findMany({
    orderBy: [{ day: "asc" }, { createdAt: "asc" }],
    include: { _count: { select: { questions: true, attempts: true } } },
  });

  return NextResponse.json({ challenges });
}

const createSchema = z.object({
  day: z.number().int().min(1).max(7),
  title: z.string().min(1),
  subtitle: z.string().optional(),
  type: z.enum(["quiz", "ai_battle", "listening", "reading", "vocabulary", "grammar", "speed", "final", "hangman"]),
  description: z.string().optional(),
  level: z.enum(["A1_A2", "B1", "B2", "C1"]).nullable().optional(),
  basePoints: z.number().int().min(1).default(10),
  timeLimitSec: z.number().int().min(1).nullable().optional(),
  maxAttempts: z.number().int().min(1).default(1),
  startTime: z.string().datetime().nullable().optional(),
  endTime: z.string().datetime().nullable().optional(),
});

export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid challenge data", issues: parsed.error.issues }, { status: 400 });
  }

  const data = parsed.data;
  const challenge = await db.challenge.create({
    data: {
      day: data.day,
      title: data.title,
      subtitle: data.subtitle,
      type: data.type,
      description: data.description,
      level: data.level ?? null,
      basePoints: data.basePoints,
      timeLimitSec: data.timeLimitSec ?? null,
      maxAttempts: data.maxAttempts,
      startTime: data.startTime ? new Date(data.startTime) : null,
      endTime: data.endTime ? new Date(data.endTime) : null,
      status: "draft",
    },
  });

  return NextResponse.json({ challenge }, { status: 201 });
}
