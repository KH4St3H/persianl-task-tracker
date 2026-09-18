"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { googleAccount, tasks } from "@/db/schema";
import { clearTokenCache, deleteTaskEvent } from "@/lib/google";
import { syncTaskToCalendar } from "@/lib/calendar-sync";

/** Push every open task with a due date to the calendar (used after connecting). */
export async function syncAllTasks() {
  const rows = await db.select({ id: tasks.id }).from(tasks).where(and(eq(tasks.status, "open"), isNotNull(tasks.dueDate)));
  for (const r of rows) await syncTaskToCalendar(r.id);
  revalidatePath("/tasks");
  revalidatePath("/settings");
}

/** Remove the account and the events the app created. The "Tasks" calendar itself is left in place. */
export async function disconnectGoogle() {
  const synced = await db.select({ id: tasks.id, eventId: tasks.googleEventId }).from(tasks).where(isNotNull(tasks.googleEventId));
  for (const t of synced) {
    try {
      await deleteTaskEvent(t.eventId!);
    } catch (e) {
      console.error("event cleanup failed", t.id, e);
    }
  }
  await db.update(tasks).set({ googleEventId: null });
  await db.delete(googleAccount);
  clearTokenCache();
  revalidatePath("/tasks");
  revalidatePath("/settings");
}
