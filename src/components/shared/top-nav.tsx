"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "./theme-provider";
import { LevelBadge } from "./level-badge";
import type { LevelKey } from "@/lib/levels";
import { cn } from "@/lib/utils";

export function TopNav({
  userName,
  level,
}: {
  userName?: string;
  level?: LevelKey | null;
}) {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();

  const links = [
    { href: "/home", label: "Home" },
    { href: "/leaderboard", label: "Leaderboard" },
    { href: "/profile", label: "Profile" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b-2 border-[var(--line)] bg-[var(--bg)]">
      <div className="mx-auto max-w-6xl px-5 h-16 flex items-center justify-between gap-4">
        <Link href="/home" className="font-[family-name:var(--font-display)] text-sm whitespace-nowrap">
          BEAT<span className="text-[var(--blue)]">THE</span>B2
        </Link>

        <nav className="hidden sm:flex items-center gap-1 font-[family-name:var(--font-mono)] text-xs font-bold uppercase tracking-wide">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "px-3 py-2 border-2 border-transparent transition-colors",
                pathname === l.href
                  ? "border-[var(--line)] bg-[var(--yellow)] text-black"
                  : "text-[var(--muted)] hover:text-[var(--ink)]"
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {level && <LevelBadge level={level} locked size="sm" className="hidden sm:inline-flex" />}
          <button
            onClick={toggle}
            aria-label="Toggle theme"
            className="w-9 h-9 grid place-items-center border-2 border-[var(--line)] hover:bg-[var(--yellow)] hover:text-black"
          >
            {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
          </button>
          {userName && (
            <div className="w-9 h-9 border-2 border-[var(--line)] bg-[var(--ink)] text-[var(--bg)] grid place-items-center font-[family-name:var(--font-mono)] font-bold text-sm">
              {userName[0]?.toUpperCase()}
            </div>
          )}
        </div>
      </div>

      <nav className="sm:hidden flex items-center gap-2 px-5 pb-3 font-[family-name:var(--font-mono)] text-xs font-bold uppercase tracking-wide overflow-x-auto">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "px-3 py-1.5 border-2 whitespace-nowrap",
              pathname === l.href
                ? "border-[var(--line)] bg-[var(--yellow)] text-black"
                : "border-[var(--line)] text-[var(--muted)]"
            )}
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
