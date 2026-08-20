import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/server/db";
import { requireAdmin } from "@/lib/server/require-admin";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const settings = await db.competitionSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton" },
    update: {},
  });

  return NextResponse.json({ settings });
}

const schema = z.object({
  startDate: z.string().datetime().nullable().optional(),
  endDate: z.string().datetime().nullable().optional(),
  dailyStartTime: z.string().datetime().nullable().optional(),
  multiplierA1A2: z.number().positive().optional(),
  multiplierB1: z.number().positive().optional(),
  multiplierB2: z.number().positive().optional(),
  multiplierC1: z.number().positive().optional(),
  referralPoints: z.number().int().min(0).optional(),
  maxAttemptsDefault: z.number().int().min(1).optional(),
});

export async function PUT(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid settings" }, { status: 400 });

  const { startDate, endDate, dailyStartTime, ...rest } = parsed.data;
  const toDate = (v: string | null | undefined) => (v ? new Date(v) : null);

  const settings = await db.competitionSettings.upsert({
    where: { id: "singleton" },
    create: {
      id: "singleton",
      ...rest,
      startDate: toDate(startDate),
      endDate: toDate(endDate),
      dailyStartTime: toDate(dailyStartTime),
    },
    update: {
      ...rest,
      ...(startDate !== undefined ? { startDate: toDate(startDate) } : {}),
      ...(endDate !== undefined ? { endDate: toDate(endDate) } : {}),
      ...(dailyStartTime !== undefined ? { dailyStartTime: toDate(dailyStartTime) } : {}),
    },
  });

  return NextResponse.json({ settings });
}
