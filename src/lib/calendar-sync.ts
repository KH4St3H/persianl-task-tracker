import { eq } from "drizzle-orm";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { deleteTaskEvent, getAccount, upsertTaskEvent } from "./google";

/**
 * Bring the calendar event for a task in line with its current state.
 * Open task with a due date -> event exists; otherwise -> no event.
 * Never throws: calendar problems must not break task edits.
 */
export async function syncTaskToCalendar(taskId: number) {
  try {
    if (!(await getAccount())) return;
    const task = await db.query.tasks.findFirst({ where: eq(tasks.id, taskId) });
    if (!task) return;
    const shouldHaveEvent = task.status === "open" && !!task.dueDate;
    if (shouldHaveEvent) {
      const eventId = await upsertTaskEvent(task);
      if (eventId !== task.googleEventId) await db.update(tasks).set({ googleEventId: eventId }).where(eq(tasks.id, taskId));
    } else if (task.googleEventId) {
      await deleteTaskEvent(task.googleEventId);
      await db.update(tasks).set({ googleEventId: null }).where(eq(tasks.id, taskId));
    }
  } catch (e) {
    console.error("calendar sync failed for task", taskId, e);
  }
}

/** Remove the event for a task that is about to be (or has been) deleted. */
export async function removeTaskEvent(eventId: string | null) {
  if (!eventId) return;
  try {
    await deleteTaskEvent(eventId);
  } catch (e) {
    console.error("calendar event delete failed", eventId, e);
  }
}
