"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function AdminLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    setLoading(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Invalid credentials");
      return;
    }
    window.location.href = "/admin";
  }

  return (
    <main className="min-h-screen bg-black text-white grid place-items-center px-5">
      <div className="w-full max-w-sm border-2 border-white p-8">
        <p className="font-[family-name:var(--font-mono)] text-xs font-bold text-[var(--yellow)] uppercase tracking-widest">
          Restricted
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl uppercase">Admin Login</h1>
        <p className="mt-1 text-sm text-white/50 font-[family-name:var(--font-mono)]">
          Can You Beat The B2?
        </p>
        <form onSubmit={submit} className="mt-6 space-y-4 font-[family-name:var(--font-mono)]">
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-white/60">Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1.5 w-full border-2 border-white/30 bg-transparent text-white px-4 py-2.5 outline-none focus:border-[var(--yellow)]"
              autoComplete="username"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-white/60">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 w-full border-2 border-white/30 bg-transparent text-white px-4 py-2.5 outline-none focus:border-[var(--yellow)]"
              autoComplete="current-password"
            />
          </div>
          {error && <p className="text-sm text-[var(--red)]">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </div>
    </main>
  );
}
