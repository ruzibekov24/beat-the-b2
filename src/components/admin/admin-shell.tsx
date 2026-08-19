"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Users, Swords, BookOpen, Headphones, Trophy, Users2, Settings, LogOut } from "lucide-react";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/challenges", label: "Challenges", icon: Swords },
  { href: "/admin/reading", label: "Reading", icon: BookOpen },
  { href: "/admin/listening", label: "Listening", icon: Headphones },
  { href: "/admin/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/admin/referrals", label: "Referrals", icon: Users2 },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  }

  return (
    <div className="min-h-screen bg-black text-white flex font-[family-name:var(--font-mono)]">
      <aside className="w-60 shrink-0 border-r-2 border-white/20 flex flex-col">
        <div className="px-5 py-5 border-b-2 border-white/20">
          <p className="font-[family-name:var(--font-display)] text-sm leading-tight uppercase">
            Beat
            <br />
            The B2
          </p>
          <p className="text-xs text-white/40 mt-1">Admin Dashboard</p>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 border-2 text-sm font-bold uppercase tracking-wide transition-colors",
                  active
                    ? "bg-[var(--yellow)] text-black border-[var(--yellow)]"
                    : "text-white/60 border-transparent hover:border-white/30 hover:text-white"
                )}
              >
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t-2 border-white/20">
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2.5 text-sm font-bold uppercase tracking-wide text-white/60 hover:text-white w-full"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-x-hidden bg-[#0A0A0A]">{children}</main>
    </div>
  );
}
