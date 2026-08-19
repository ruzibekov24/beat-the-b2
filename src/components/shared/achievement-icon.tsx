import { Trophy, Flame, Swords, Bot, Users, Award, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const ACHIEVEMENT_ICON_MAP: Record<string, LucideIcon> = {
  first_challenge: Trophy,
  seven_day_streak: Flame,
  b2_hunter: Swords,
  bot_slayer: Bot,
  referral_master: Users,
};

export function AchievementIcon({
  achievementKey,
  size = 22,
  className,
}: {
  achievementKey: string;
  size?: number;
  className?: string;
}) {
  const Icon = ACHIEVEMENT_ICON_MAP[achievementKey] ?? Award;
  return <Icon size={size} strokeWidth={2} className={cn("shrink-0", className)} />;
}
