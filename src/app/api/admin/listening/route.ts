import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { requireAdmin } from "@/lib/server/require-admin";
import { uploadAudioFile } from "@/lib/server/storage";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const materials = await db.listeningMaterial.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ materials });
}

// Uses multipart/form-data so the admin can attach an actual audio file
// alongside the metadata, rather than hand-typing a hosted URL.
export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const form = await req.formData();
  const title = form.get("title");
  const level = form.get("level");
  const durationSec = form.get("durationSec");
  const isPublished = form.get("isPublished") === "true";
  const file = form.get("audio");

  if (typeof title !== "string" || typeof level !== "string" || !(file instanceof File)) {
    return NextResponse.json({ error: "Missing title, level, or audio file" }, { status: 400 });
  }

  const audioUrl = await uploadAudioFile(file);

  const material = await db.listeningMaterial.create({
    data: {
      title,
      level: level as "A1_A2" | "B1" | "B2" | "C1",
      audioUrl,
      durationSec: durationSec ? Number(durationSec) : null,
      isPublished,
    },
  });

  return NextResponse.json({ material }, { status: 201 });
}
