export type LevelKey = "A1_A2" | "B1" | "B2" | "C1";

export interface LevelConfig {
  key: LevelKey;
  label: string;
  subtitle: string;
  multiplier: number;
  multiplierLabel: string;
  color: string; // tailwind color token base, e.g. "emerald"
  hex: string;
  bgSoft: string; // tailwind class for soft background
  textClass: string;
  ringClass: string;
  gradient: string; // tailwind gradient classes
}

export const LEVELS: Record<LevelKey, LevelConfig> = {
  A1_A2: {
    key: "A1_A2",
    label: "A1–A2",
    subtitle: "BEGINNER",
    multiplier: 1.0,
    multiplierLabel: "×1.0 POINTS",
    color: "emerald",
    hex: "#10B981",
    bgSoft: "bg-emerald-50 dark:bg-emerald-500/10",
    textClass: "text-emerald-600 dark:text-emerald-400",
    ringClass: "ring-emerald-500",
    gradient: "from-emerald-400 to-emerald-600",
  },
  B1: {
    key: "B1",
    label: "B1",
    subtitle: "INTERMEDIATE",
    multiplier: 1.25,
    multiplierLabel: "×1.25 POINTS",
    color: "amber",
    hex: "#F59E0B",
    bgSoft: "bg-amber-50 dark:bg-amber-500/10",
    textClass: "text-amber-600 dark:text-amber-400",
    ringClass: "ring-amber-500",
    gradient: "from-amber-400 to-amber-600",
  },
  B2: {
    key: "B2",
    label: "B2",
    subtitle: "ADVANCED",
    multiplier: 1.5,
    multiplierLabel: "×1.5 POINTS",
    color: "blue",
    hex: "#2563EB",
    bgSoft: "bg-blue-50 dark:bg-blue-500/10",
    textClass: "text-blue-600 dark:text-blue-400",
    ringClass: "ring-blue-500",
    gradient: "from-blue-500 to-blue-700",
  },
  C1: {
    key: "C1",
    label: "C1",
    subtitle: "ALMOST IMPOSSIBLE",
    multiplier: 2.0,
    multiplierLabel: "×2.0 POINTS",
    color: "violet",
    hex: "#7C3AED",
    bgSoft: "bg-violet-50 dark:bg-violet-500/10",
    textClass: "text-violet-600 dark:text-violet-400",
    ringClass: "ring-violet-500",
    gradient: "from-violet-500 to-purple-700",
  },
};

export const LEVEL_ORDER: LevelKey[] = ["A1_A2", "B1", "B2", "C1"];

export function getLevelConfig(level: LevelKey | null | undefined): LevelConfig | null {
  if (!level) return null;
  return LEVELS[level];
}

// `icon` names map to lucide-react components — see ChallengeDayIcon in
// src/components/shared/challenge-day-icon.tsx for the lookup.
export const CHALLENGE_DAY_TITLES: Record<number, { title: string; subtitle: string; icon: string }> = {
  1: { title: "PROVE YOUR LEVEL", subtitle: "Level Assessment", icon: "ClipboardCheck" },
  2: { title: "CAN YOU BEAT THE BOT?", subtitle: "AI Bot Battle", icon: "Bot" },
  3: { title: "LISTEN OR LOSE", subtitle: "Listening Challenge", icon: "Headphones" },
  4: { title: "VOCABULARY HUNT", subtitle: "Vocabulary Challenge", icon: "BookOpenText" },
  5: { title: "READING UNDER PRESSURE", subtitle: "Reading Challenge", icon: "BookOpen" },
  6: { title: "CAN YOU BEAT THE B2?", subtitle: "Main B2 Battle", icon: "Swords" },
  7: { title: "GRAND FINAL", subtitle: "Multi-Round Final", icon: "Trophy" },
};
