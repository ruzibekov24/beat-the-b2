import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { getSession } from "@/lib/server/auth";
import type { LevelKey } from "@/lib/levels";

const VALID_LEVELS: LevelKey[] = ["A1_A2", "B1", "B2", "C1"];

export async function GET(req: NextRequest) {
  const session = await getSession();
  const levelParam = req.nextUrl.searchParams.get("level");
  const level = VALID_LEVELS.includes(levelParam as LevelKey) ? (levelParam as LevelKey) : undefined;

  const users = await db.user.findMany({
    where: {
      levelLockedAt: { not: null },
      ...(level ? { level } : {}),
    },
    orderBy: { totalPoints: "desc" },
    take: 100,
    select: {
      id: true,
      name: true,
      telegramUsername: true,
      photoUrl: true,
      level: true,
      totalPoints: true,
    },
  });

  const rows = users.map((u, i) => ({ rank: i + 1, ...u }));

  const currentUserId = session?.userId;

  return NextResponse.json({ rows, currentUserId });
}
