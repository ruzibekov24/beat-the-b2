import { db } from "./db";

/**
 * Checks simple, deterministic achievement conditions after a scoring event
 * and unlocks any newly-earned ones. Idempotent — relies on the
 * @@unique([userId, achievementId]) constraint so calling this multiple
 * times never double-unlocks.
 *
 * Achievement rows are looked up by `key`; if a key isn't seeded yet, that
 * achievement is silently skipped (seed.ts is the source of truth for which
 * achievements exist).
 */
export async function checkAndUnlockAchievements(userId: string) {
  const [attemptCount, aiBattleWins, referralCount, user] = await Promise.all([
    db.challengeAttempt.count({ where: { userId, status: "submitted" } }),
    db.challengeAttempt.count({
      where: { userId, status: "submitted", challenge: { type: "ai_battle" } },
    }),
    db.user.count({ where: { referredById: userId } }),
    db.user.findUnique({ where: { id: userId }, select: { dayStreak: true } }),
  ]);

  const toUnlock: string[] = [];
  if (attemptCount >= 1) toUnlock.push("first_challenge");
  if (aiBattleWins >= 1) toUnlock.push("bot_slayer");
  if (referralCount >= 1) toUnlock.push("referral_master");
  if ((user?.dayStreak ?? 0) >= 7) toUnlock.push("seven_day_streak");

  if (toUnlock.length === 0) return;

  const achievements = await db.achievement.findMany({ where: { key: { in: toUnlock } } });

  await Promise.all(
    achievements.map((a) =>
      db.userAchievement.upsert({
        where: { userId_achievementId: { userId, achievementId: a.id } },
        create: { userId, achievementId: a.id },
        update: {},
      })
    )
  );
}
