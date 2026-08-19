import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { requireAdmin } from "@/lib/server/require-admin";

export async function GET(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const q = req.nextUrl.searchParams.get("q")?.trim();
  const levelParam = req.nextUrl.searchParams.get("level");

  const users = await db.user.findMany({
    where: {
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { telegramUsername: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(levelParam ? { level: levelParam as "A1_A2" | "B1" | "B2" | "C1" } : {}),
    },
    orderBy: { totalPoints: "desc" },
    take: 200,
    select: {
      id: true,
      name: true,
      telegramUsername: true,
      telegramId: true,
      level: true,
      levelLockedAt: true,
      totalPoints: true,
      dayStreak: true,
      createdAt: true,
      _count: { select: { attempts: true, referrals: true } },
    },
  });

  return NextResponse.json({ users });
}
