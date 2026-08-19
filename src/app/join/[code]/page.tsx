import { redirect } from "next/navigation";

// Referral links land here, then forward to onboarding with ?ref= preserved.
// The actual referral is only recorded server-side in /api/auth/telegram
// once the new user authenticates — this page never grants points itself.
export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  redirect(`/onboarding?ref=${encodeURIComponent(code)}`);
}
