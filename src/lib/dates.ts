import { addDays, format, parseISO } from "date-fns";

/** IANA zone the user lives in. Inlined at build time so server and client agree. */
export const APP_TZ = process.env.NEXT_PUBLIC_APP_TIMEZONE || "UTC";

const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: APP_TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const hm = new Intl.DateTimeFormat("en-GB", { timeZone: APP_TZ, hour: "2-digit", minute: "2-digit", hour12: false });

/** Calendar date (yyyy-MM-dd) of an instant, in the app timezone. */
export function dateInTZ(d: Date = new Date()) {
  return ymd.format(d); // en-CA yields ISO-like yyyy-MM-dd
}

export function todayISO() {
  return dateInTZ();
}

export function isOverdue(due: string | null) {
  return !!due && due < todayISO();
}

export function isDueToday(due: string | null) {
  return !!due && due === todayISO();
}

export function formatDue(due: string | null) {
  if (!due) return "";
  if (due === todayISO()) return "Today";
  return format(parseISO(due), "MMM d");
}

/** HH:mm of an instant in the app timezone. */
export function timeInTZ(d: Date) {
  return hm.format(d);
}

/** The instant at which the given calendar date starts (00:00) in the app timezone. */
export function startOfDayInTZ(date: string = todayISO()): Date {
  const [y, m, d] = date.split("-").map(Number);
  let guess = Date.UTC(y, m - 1, d);
  // Adjust the UTC guess by the zone's wall-clock difference (handles any offset / DST).
  for (let i = 0; i < 2; i++) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: APP_TZ,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).formatToParts(new Date(guess));
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
    const wall = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
    const diff = wall - Date.UTC(y, m - 1, d);
    if (diff === 0) break;
    guess -= diff;
  }
  return new Date(guess);
}

export function addDaysISO(date: string, n: number) {
  return format(addDays(parseISO(date), n), "yyyy-MM-dd");
}
