import { NextRequest, NextResponse } from "next/server";
import { buildGoogleAuthUrl, generateOAuthState } from "@/lib/server/google-auth";

const STATE_COOKIE = "b2_oauth_state";
const REF_COOKIE = "b2_oauth_ref";

export async function GET(req: NextRequest) {
  const state = generateOAuthState();
  const ref = req.nextUrl.searchParams.get("ref");

  const res = NextResponse.redirect(buildGoogleAuthUrl(state));

  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10, // 10 minutes is plenty for the OAuth round trip
  });

  if (ref) {
    res.cookies.set(REF_COOKIE, ref, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 10,
    });
  }

  return res;
}
