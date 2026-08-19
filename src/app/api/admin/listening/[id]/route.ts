import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/server/db";
import { requireAdmin } from "@/lib/server/require-admin";

const schema = z.object({
  title: z.string().min(1).optional(),
  level: z.enum(["A1_A2", "B1", "B2", "C1"]).optional(),
  durationSec: z.number().int().nullable().optional(),
  isPublished: z.boolean().optional(),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await params;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  const material = await db.listeningMaterial.update({ where: { id }, data: parsed.data });
  return NextResponse.json({ material });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await params;
  await db.listeningMaterial.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
