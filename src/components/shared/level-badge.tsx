import { getLevelConfig, type LevelKey } from "@/lib/levels";
import { cn } from "@/lib/utils";
import { Lock } from "lucide-react";

export function LevelBadge({
  level,
  locked,
  size = "md",
  className,
}: {
  level: LevelKey | null | undefined;
  locked?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const config = getLevelConfig(level);
  if (!config) {
    return (
      <span className="inline-flex items-center gap-1.5 border-2 border-[var(--line)] px-3 py-1 font-[family-name:var(--font-mono)] text-xs font-bold uppercase text-[var(--muted)]">
        No level yet
      </span>
    );
  }

  const sizes = {
    sm: "text-xs px-2.5 py-1",
    md: "text-sm px-3.5 py-1.5",
    lg: "text-base px-5 py-2",
  };

  const iconSizes = { sm: 11, md: 13, lg: 15 };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border-2 border-[var(--line)] font-[family-name:var(--font-mono)] font-bold uppercase",
        sizes[size],
        className
      )}
      style={{ color: config.hex }}
    >
      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: config.hex }} />
      <span>{config.label}</span>
      {locked && <Lock size={iconSizes[size]} strokeWidth={2.5} className="opacity-70 shrink-0" />}
    </span>
  );
}
