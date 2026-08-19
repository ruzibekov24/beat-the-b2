import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/server/auth";

// Server-side guard for every /admin/* page except /admin/login.
// Runs in the Node.js runtime (not Edge), reading the same cookie jar the
// login route writes to via NextResponse.cookies.set — no runtime mismatch.
export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAdminSession();
  if (!session) {
    redirect("/admin/login");
  }
  return <>{children}</>;
}
