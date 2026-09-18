import { format, isBefore, isToday, parseISO, startOfDay } from "date-fns";

export function todayISO() {
  return format(new Date(), "yyyy-MM-dd");
}

export function isOverdue(due: string | null) {
  if (!due) return false;
  return isBefore(parseISO(due), startOfDay(new Date()));
}

export function isDueToday(due: string | null) {
  if (!due) return false;
  return isToday(parseISO(due));
}

export function formatDue(due: string | null) {
  if (!due) return "";
  const d = parseISO(due);
  if (isToday(d)) return "Today";
  return format(d, "MMM d");
}
