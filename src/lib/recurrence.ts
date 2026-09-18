import { addDays, addMonths, addWeeks, format, parseISO } from "date-fns";
import type { RepeatRule } from "@/db/schema";

/** Next due date (yyyy-MM-dd) after `from`, given a rule. Returns null if not recurring. */
export function nextDueDate(from: string | null, rule: RepeatRule, interval: number): string | null {
  if (rule === "none") return null;
  const base = from ? parseISO(from) : new Date();
  const n = Math.max(1, interval || 1);
  let next: Date;
  switch (rule) {
    case "daily":
      next = addDays(base, 1);
      break;
    case "weekly":
      next = addWeeks(base, 1);
      break;
    case "monthly":
      next = addMonths(base, 1);
      break;
    case "every_n_days":
      next = addDays(base, n);
      break;
  }
  return format(next, "yyyy-MM-dd");
}

export function describeRepeat(rule: RepeatRule, interval: number) {
  switch (rule) {
    case "daily":
      return "Daily";
    case "weekly":
      return "Weekly";
    case "monthly":
      return "Monthly";
    case "every_n_days":
      return `Every ${interval} days`;
    default:
      return "";
  }
}
