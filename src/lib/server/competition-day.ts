import { db } from "./db";

export const LAST_DAY = 7;

/**
 * UTC instant at which competition day `n` begins.
 *
 * Day 1 begins exactly at `startDate`. Every later day begins at
 * `dailyStartTime`'s time-of-day on the calendar day `n - 1` days after
 * `startDate`, which lets the opening day run on its own schedule (e.g. a
 * midday launch) while days 2-7 settle into a fixed evening slot.
 */
export function dayStart(startDate: Date, dailyStartTime: Date | null, n: number): Date {
  if (n <= 1 || !dailyStartTime) {
    return new Date(startDate.getTime() + (n - 1) * 24 * 60 * 60 * 1000);
  }
  return new Date(
    Date.UTC(
      startDate.getUTCFullYear(),
      startDate.getUTCMonth(),
      startDate.getUTCDate() + (n - 1),
      dailyStartTime.getUTCHours(),
      dailyStartTime.getUTCMinutes(),
      0,
      0
    )
  );
}

/** Computes the current competition day (1-7) from CompetitionSettings. */
export async function getCurrentDay(): Promise<number> {
  const settings = await db.competitionSettings.findUnique({ where: { id: "singleton" } });
  if (!settings?.startDate) return 1;

  const now = Date.now();
  let day = 1;
  for (let n = 2; n <= LAST_DAY; n++) {
    if (now >= dayStart(settings.startDate, settings.dailyStartTime, n).getTime()) day = n;
    else break;
  }
  return day;
}
