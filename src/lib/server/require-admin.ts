import { NextResponse } from "next/server";
import { getAdminSession } from "./auth";

/**
 * Call at the top of every /api/admin/** route. Returns null when the
 * caller is authenticated as admin, or a 401 response to return immediately.
 * Centralizing this avoids any admin endpoint accidentally shipping without
 * the check (see spec §36: "allow unauthorized admin access" is a hard no).
 */
export async function requireAdmin() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Admin authentication required" }, { status: 401 });
  }
  return null;
}
