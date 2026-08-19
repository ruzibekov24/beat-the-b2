import { ClipboardCheck, Bot, Headphones, BookOpenText, BookOpen, Swords, Trophy, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, LucideIcon> = {
  ClipboardCheck,
  Bot,
  Headphones,
  BookOpenText,
  BookOpen,
  Swords,
  Trophy,
};

export function ChallengeDayIcon({
  icon,
  size = 20,
  className,
}: {
  icon: string;
  size?: number;
  className?: string;
}) {
  const Icon = ICON_MAP[icon] ?? ClipboardCheck;
  return <Icon size={size} strokeWidth={2} className={cn("shrink-0", className)} />;
}
