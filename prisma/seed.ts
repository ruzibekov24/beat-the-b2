import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  // --- Competition settings (singleton) ---
  await db.competitionSettings.upsert({
    where: { id: "singleton" },
    create: {
      id: "singleton",
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    update: {},
  });

  // --- Achievements ---
  const achievements = [
    { key: "first_challenge", title: "First Challenge", icon: "trophy", description: "Complete your first challenge." },
    { key: "seven_day_streak", title: "7 Day Streak", icon: "flame", description: "Stay active for all 7 days." },
    { key: "b2_hunter", title: "B2 Hunter", icon: "swords", description: "Complete the B2 Battle challenge." },
    { key: "bot_slayer", title: "Bot Slayer", icon: "bot", description: "Beat the AI in a bot battle." },
    { key: "referral_master", title: "Referral Master", icon: "users", description: "Invite at least one verified friend." },
  ];
  for (const a of achievements) {
    await db.achievement.upsert({ where: { key: a.key }, create: a, update: a });
  }

  // --- Admin user ---
  const adminUsername = process.env.SEED_ADMIN_USERNAME ?? "admin";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "changeme123";
  const passwordHash = await bcrypt.hash(adminPassword, 10);
  await db.adminUser.upsert({
    where: { username: adminUsername },
    create: { username: adminUsername, passwordHash },
    update: { passwordHash },
  });
  console.log(`Admin user ready → username: "${adminUsername}" password: "${adminPassword}" (CHANGE THIS)`);

  // --- Demo Day 1 challenge (clearly marked as demo content per spec §39) ---
  const existingDemo = await db.challenge.findFirst({ where: { day: 1, title: "PROVE YOUR LEVEL (Demo)" } });
  if (!existingDemo) {
    await db.challenge.create({
      data: {
        day: 1,
        title: "PROVE YOUR LEVEL (Demo)",
        subtitle: "Level Assessment",
        type: "quiz",
        description: "Demo content — replace with real questions via the admin panel before launch.",
        level: "B2",
        basePoints: 10,
        maxAttempts: 1,
        status: "published",
        questions: {
          create: [
            {
              order: 1,
              type: "multiple_choice",
              prompt: "Choose the correct form: 'By the time we arrived, the film ___ already ___.'",
              points: 10,
              options: {
                create: [
                  { label: "A", text: "has / started", isCorrect: false },
                  { label: "B", text: "had / started", isCorrect: true },
                  { label: "C", text: "was / starting", isCorrect: false },
                  { label: "D", text: "have / started", isCorrect: false },
                ],
              },
            },
            {
              order: 2,
              type: "multiple_choice",
              prompt: "Which word best fits: 'Despite ___ tired, she finished the report.'",
              points: 10,
              options: {
                create: [
                  { label: "A", text: "being", isCorrect: true },
                  { label: "B", text: "be", isCorrect: false },
                  { label: "C", text: "to be", isCorrect: false },
                  { label: "D", text: "been", isCorrect: false },
                ],
              },
            },
          ],
        },
      },
    });
  }

  // --- Demo Day 2 AI Battle challenge ---
  const existingBattle = await db.challenge.findFirst({ where: { day: 2, type: "ai_battle" } });
  if (!existingBattle) {
    await db.challenge.create({
      data: {
        day: 2,
        title: "CAN YOU BEAT THE BOT?",
        subtitle: "AI Bot Battle",
        type: "ai_battle",
        description: "Demo content.",
        level: "B2",
        basePoints: 10,
        maxAttempts: 1,
        status: "published",
        questions: {
          create: [
            {
              order: 1,
              type: "multiple_choice",
              prompt: "Select the word closest in meaning to 'meticulous'.",
              points: 10,
              options: {
                create: [
                  { label: "A", text: "careless", isCorrect: false },
                  { label: "B", text: "thorough", isCorrect: true },
                  { label: "C", text: "quick", isCorrect: false },
                  { label: "D", text: "loud", isCorrect: false },
                ],
              },
            },
          ],
        },
      },
    });
  }

  // --- Daily missions ---
  const missions = [
    { day: 1, title: "Vocabulary warm-up", icon: "book", points: 25 },
    { day: 1, title: "Daily streak", icon: "flame", points: 25 },
  ];
  for (const m of missions) {
    const exists = await db.dailyMission.findFirst({ where: { day: m.day, title: m.title } });
    if (!exists) await db.dailyMission.create({ data: m });
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
