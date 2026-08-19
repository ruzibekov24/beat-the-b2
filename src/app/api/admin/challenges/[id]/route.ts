import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/server/db";
import { requireAdmin } from "@/lib/server/require-admin";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  const challenge = await db.challenge.findUnique({
    where: { id },
    include: { questions: { orderBy: { order: "asc" }, include: { options: true } } },
  });
  if (!challenge) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ challenge });
}

const updateSchema = z.object({
  title: z.string().optional(),
  subtitle: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  level: z.enum(["A1_A2", "B1", "B2", "C1"]).nullable().optional(),
  basePoints: z.number().int().min(1).optional(),
  timeLimitSec: z.number().int().nullable().optional(),
  maxAttempts: z.number().int().min(1).optional(),
  status: z.enum(["draft", "scheduled", "published", "archived"]).optional(),
  startTime: z.string().datetime().nullable().optional(),
  endTime: z.string().datetime().nullable().optional(),
  // Full question replacement — admin UI sends the whole question set on save.
  questions: z
    .array(
      z.object({
        order: z.number().int(),
        type: z.enum(["multiple_choice", "fill_blank", "matching", "true_false"]),
        prompt: z.string().min(1),
        points: z.number().int().min(1),
        explanation: z.string().optional(),
        options: z.array(
          z.object({
            label: z.string(),
            text: z.string().min(1),
            isCorrect: z.boolean(),
          })
        ),
      })
    )
    .optional(),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid update", issues: parsed.error.issues }, { status: 400 });
  }

  const { questions, ...rest } = parsed.data;

  const challenge = await db.$transaction(async (tx) => {
    const updated = await tx.challenge.update({
      where: { id },
      data: {
        ...rest,
        startTime: rest.startTime !== undefined ? (rest.startTime ? new Date(rest.startTime) : null) : undefined,
        endTime: rest.endTime !== undefined ? (rest.endTime ? new Date(rest.endTime) : null) : undefined,
      },
    });

    if (questions) {
      // Replace the question set atomically — cascade deletes remove old options/answers.
      await tx.challengeQuestion.deleteMany({ where: { challengeId: id } });
      for (const q of questions) {
        await tx.challengeQuestion.create({
          data: {
            challengeId: id,
            order: q.order,
            type: q.type,
            prompt: q.prompt,
            points: q.points,
            explanation: q.explanation,
            options: { create: q.options },
          },
        });
      }
    }

    return updated;
  });

  return NextResponse.json({ challenge });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  await db.challenge.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
