import { eq } from "drizzle-orm";
import { addDays, format, startOfDay } from "date-fns";
import { db } from "@/db";
import { googleAccount, type Task } from "@/db/schema";

const SCOPES = ["https://www.googleapis.com/auth/calendar", "openid", "email"].join(" ");
const TASKS_CALENDAR_NAME = "Tasks";

export function googleConfigured() {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function creds() {
  const id = process.env.GOOGLE_CLIENT_ID;
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  if (!id || !secret) throw new Error("GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not set");
  return { id, secret };
}

export function redirectUri(origin: string) {
  return `${origin}/api/google/callback`;
}

export function authUrl(origin: string, state: string) {
  const p = new URLSearchParams({
    client_id: creds().id,
    redirect_uri: redirectUri(origin),
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
}

type TokenResponse = { access_token: string; expires_in: number; refresh_token?: string; id_token?: string };

async function tokenRequest(body: Record<string, string>): Promise<TokenResponse> {
  const { id, secret } = creds();
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: id, client_secret: secret, ...body }),
  });
  if (!r.ok) throw new Error(`Google token error ${r.status}: ${await r.text()}`);
  return r.json();
}

export async function exchangeCode(code: string, origin: string) {
  const t = await tokenRequest({ code, grant_type: "authorization_code", redirect_uri: redirectUri(origin) });
  if (!t.refresh_token) throw new Error("Google did not return a refresh token; remove the app at myaccount.google.com/permissions and retry");
  const info = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", { headers: { Authorization: `Bearer ${t.access_token}` } });
  const { email } = (await info.json()) as { email?: string };
  return { refreshToken: t.refresh_token, accessToken: t.access_token, email: email ?? "unknown" };
}

// ---- account & access token ----

export async function getAccount() {
  return db.query.googleAccount.findFirst();
}

let cached: { token: string; exp: number } | null = null;

async function accessToken() {
  if (cached && cached.exp > Date.now() + 30_000) return cached.token;
  const acct = await getAccount();
  if (!acct) throw new Error("Google account not connected");
  const t = await tokenRequest({ refresh_token: acct.refreshToken, grant_type: "refresh_token" });
  cached = { token: t.access_token, exp: Date.now() + t.expires_in * 1000 };
  return cached.token;
}

export function clearTokenCache() {
  cached = null;
}

async function gcal<T>(path: string, init: RequestInit & { query?: Record<string, string> } = {}): Promise<T> {
  const token = await accessToken();
  const url = new URL(`https://www.googleapis.com/calendar/v3${path}`);
  for (const [k, v] of Object.entries(init.query ?? {})) url.searchParams.set(k, v);
  const r = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  if (r.status === 204) return undefined as T;
  if (!r.ok) {
    const err = new Error(`Google Calendar ${init.method ?? "GET"} ${path} -> ${r.status}: ${await r.text()}`) as Error & { status?: number };
    err.status = r.status;
    throw err;
  }
  return r.json();
}

// ---- calendars ----

export async function ensureTasksCalendar(): Promise<string> {
  const acct = await getAccount();
  if (!acct) throw new Error("Google account not connected");
  if (acct.calendarId) return acct.calendarId;
  const list = await gcal<{ items: { id: string; summary: string; accessRole: string }[] }>("/users/me/calendarList");
  let id = list.items.find((c) => c.summary === TASKS_CALENDAR_NAME && c.accessRole === "owner")?.id;
  if (!id) {
    const created = await gcal<{ id: string }>("/calendars", { method: "POST", body: JSON.stringify({ summary: TASKS_CALENDAR_NAME }) });
    id = created.id;
  }
  await db.update(googleAccount).set({ calendarId: id }).where(eq(googleAccount.id, acct.id));
  return id;
}

// ---- events for tasks (all-day on the due date) ----

function eventBody(task: Task) {
  const due = task.dueDate!;
  return {
    summary: task.title,
    description: task.notes || undefined,
    start: { date: due },
    end: { date: format(addDays(new Date(due + "T00:00:00"), 1), "yyyy-MM-dd") },
    transparency: "transparent",
    extendedProperties: { private: { taskId: String(task.id) } },
  };
}

export async function upsertTaskEvent(task: Task): Promise<string> {
  const cal = await ensureTasksCalendar();
  if (task.googleEventId) {
    try {
      await gcal(`/calendars/${encodeURIComponent(cal)}/events/${task.googleEventId}`, { method: "PATCH", body: JSON.stringify(eventBody(task)) });
      return task.googleEventId;
    } catch (e) {
      if ((e as { status?: number }).status !== 404 && (e as { status?: number }).status !== 410) throw e;
      // event was deleted on the calendar side: fall through and recreate
    }
  }
  const created = await gcal<{ id: string }>(`/calendars/${encodeURIComponent(cal)}/events`, { method: "POST", body: JSON.stringify(eventBody(task)) });
  return created.id;
}

export async function deleteTaskEvent(eventId: string) {
  const acct = await getAccount();
  if (!acct?.calendarId) return;
  try {
    await gcal(`/calendars/${encodeURIComponent(acct.calendarId)}/events/${eventId}`, { method: "DELETE" });
  } catch (e) {
    const s = (e as { status?: number }).status;
    if (s !== 404 && s !== 410) throw e;
  }
}

// ---- reading the user's own calendars for the Today view ----

export type CalendarEvent = { id: string; title: string; start: string; end: string; allDay: boolean; calendar: string; link?: string };

export async function listEventsForDays(days = 1): Promise<CalendarEvent[]> {
  const acct = await getAccount();
  if (!acct) return [];
  const from = startOfDay(new Date());
  const to = addDays(from, days);
  const list = await gcal<{ items: { id: string; summary: string; accessRole: string; selected?: boolean }[] }>("/users/me/calendarList");
  const cals = list.items.filter((c) => c.id !== acct.calendarId && c.selected !== false);
  const results = await Promise.all(
    cals.map(async (c) => {
      try {
        const r = await gcal<{ items: GEvent[] }>(`/calendars/${encodeURIComponent(c.id)}/events`, {
          query: { timeMin: from.toISOString(), timeMax: to.toISOString(), singleEvents: "true", orderBy: "startTime", maxResults: "50" },
        });
        return (r.items ?? [])
          .filter((e) => e.status !== "cancelled")
          .map<CalendarEvent>((e) => ({
            id: e.id,
            title: e.summary ?? "(untitled)",
            start: e.start.dateTime ?? e.start.date ?? "",
            end: e.end.dateTime ?? e.end.date ?? "",
            allDay: !e.start.dateTime,
            calendar: c.summary,
            link: e.htmlLink,
          }));
      } catch {
        return [];
      }
    }),
  );
  return results.flat().sort((a, b) => a.start.localeCompare(b.start));
}

type GEvent = {
  id: string;
  summary?: string;
  status?: string;
  htmlLink?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
};
