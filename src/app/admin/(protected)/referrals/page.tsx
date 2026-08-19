"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/admin-shell";

interface Referrer {
  id: string;
  name: string;
  telegramUsername: string | null;
  referralCode: string;
  friendsInvited: number;
  referralPoints: number;
}

export default function AdminReferralsPage() {
  const [data, setData] = useState<{ totalRewards: number; topReferrers: Referrer[] } | null>(null);

  useEffect(() => {
    fetch("/api/admin/referrals").then((r) => r.json()).then(setData);
  }, []);

  return (
    <AdminShell>
      <div className="p-8">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold">Referrals</h1>
        {data && <p className="mt-1 text-sm text-white/50">{data.totalRewards} total referral rewards issued</p>}

        <div className="mt-6 border-2 border border-white/20 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-black text-white/50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Friends Invited</th>
                <th className="px-4 py-3 font-medium">Referral Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/20">
              {data?.topReferrers.length === 0 || !data ? (
                <tr><td className="px-4 py-6 text-white/40" colSpan={4}>No referrals yet.</td></tr>
              ) : (
                data.topReferrers.map((r) => (
                  <tr key={r.id} className="hover:bg-black/50">
                    <td className="px-4 py-3">{r.name} <span className="text-white/40">@{r.telegramUsername}</span></td>
                    <td className="px-4 py-3 font-mono text-white/50">{r.referralCode}</td>
                    <td className="px-4 py-3 font-semibold">{r.friendsInvited}</td>
                    <td className="px-4 py-3 font-semibold">{r.referralPoints}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}
