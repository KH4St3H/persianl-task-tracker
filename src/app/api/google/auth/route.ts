import { NextResponse, type NextRequest } from "next/server";
import { authUrl, googleConfigured } from "@/lib/google";

export async function GET(req: NextRequest) {
  if (!googleConfigured()) return NextResponse.redirect(new URL("/settings?error=not_configured", req.url));
  const state = crypto.randomUUID();
  const res = NextResponse.redirect(authUrl(req.nextUrl.origin, state));
  res.cookies.set("g_oauth_state", state, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 600 });
  return res;
}
