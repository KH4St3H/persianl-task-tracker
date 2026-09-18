import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { googleAccount } from "@/db/schema";
import { clearTokenCache, ensureTasksCalendar, exchangeCode } from "@/lib/google";
import { syncAllTasks } from "@/actions/google";

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expected = req.cookies.get("g_oauth_state")?.value;
  const fail = (reason: string) => {
    const res = NextResponse.redirect(new URL(`/settings?error=${reason}`, url.origin));
    res.cookies.delete("g_oauth_state");
    return res;
  };
  if (url.searchParams.get("error")) return fail("denied");
  if (!code || !state || !expected || state !== expected) return fail("state");

  try {
    const { refreshToken, email } = await exchangeCode(code, url.origin);
    await db.delete(googleAccount);
    clearTokenCache();
    await db.insert(googleAccount).values({ email, refreshToken });
    await ensureTasksCalendar();
    await syncAllTasks();
  } catch (e) {
    console.error("Google connect failed", e);
    return fail("exchange");
  }
  const res = NextResponse.redirect(new URL("/settings?connected=1", url.origin));
  res.cookies.delete("g_oauth_state");
  return res;
}
