import { db } from "./db";

/** Computes the current competition day (1-7) from CompetitionSettings.startDate. */
export async function getCurrentDay(): Promise<number> {
  const settings = await db.competitionSettings.findUnique({ where: { id: "singleton" } });
  if (!settings?.startDate) return 1;
  const diffDays = Math.floor((Date.now() - settings.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return Math.min(Math.max(diffDays, 1), 7);
}
