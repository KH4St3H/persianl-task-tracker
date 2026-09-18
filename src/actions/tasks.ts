"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { REPEAT_RULES, subtasks, tasks, taskTags, type RepeatRule } from "@/db/schema";
import { nextDueDate } from "@/lib/recurrence";

const revalidate = () => {
  revalidatePath("/tasks");
  revalidatePath("/projects");
};

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(n)));

export type TaskInput = {
  title: string;
  notes?: string;
  dueDate?: string | null;
  projectId?: number | null;
  urgent?: boolean;
  important?: boolean;
  level?: number;
  impact?: number;
  effort?: number;
  repeatRule?: RepeatRule;
  repeatInterval?: number;
  tagIds?: number[];
};

function normalize(input: TaskInput) {
  return {
    title: input.title.trim(),
    notes: input.notes ?? "",
    dueDate: input.dueDate || null,
    projectId: input.projectId ?? null,
    urgent: !!input.urgent,
    important: !!input.important,
    level: clamp(input.level ?? 2, 1, 3),
    impact: clamp(input.impact ?? 3, 1, 5),
    effort: clamp(input.effort ?? 3, 1, 5),
    repeatRule: REPEAT_RULES.includes(input.repeatRule ?? "none") ? (input.repeatRule ?? "none") : "none",
    repeatInterval: clamp(input.repeatInterval ?? 1, 1, 365),
  };
}

async function setTags(taskId: number, tagIds: number[] | undefined) {
  if (tagIds === undefined) return;
  await db.delete(taskTags).where(eq(taskTags.taskId, taskId));
  if (tagIds.length) await db.insert(taskTags).values(tagIds.map((tagId) => ({ taskId, tagId })));
}

export async function quickAddTask(title: string) {
  if (!title.trim()) return;
  await createTask({ title });
}

export async function createTask(input: TaskInput) {
  const data = normalize(input);
  if (!data.title) return;
  const [{ min }] = await db.select({ min: sql<number>`coalesce(min(${tasks.manualRank}), 0)` }).from(tasks);
  const [row] = await db
    .insert(tasks)
    .values({ ...data, manualRank: Number(min) - 1 })
    .returning({ id: tasks.id });
  await setTags(row.id, input.tagIds);
  revalidate();
  return row.id;
}

export async function updateTask(id: number, input: TaskInput) {
  const data = normalize(input);
  if (!data.title) return;
  await db.update(tasks).set(data).where(eq(tasks.id, id));
  await setTags(id, input.tagIds);
  revalidate();
}

export async function deleteTask(id: number) {
  await db.delete(tasks).where(eq(tasks.id, id));
  revalidate();
}

export async function setTaskDone(id: number, done: boolean) {
  const task = await db.query.tasks.findFirst({ where: eq(tasks.id, id), with: { subtasks: true, taskTags: true } });
  if (!task) return;

  await db
    .update(tasks)
    .set({ status: done ? "done" : "open", completedAt: done ? new Date() : null })
    .where(eq(tasks.id, id));

  // Spawn next occurrence for recurring tasks.
  if (done && task.repeatRule !== "none") {
    const due = nextDueDate(task.dueDate, task.repeatRule, task.repeatInterval);
    const [next] = await db
      .insert(tasks)
      .values({
        title: task.title,
        notes: task.notes,
        dueDate: due,
        projectId: task.projectId,
        urgent: task.urgent,
        important: task.important,
        level: task.level,
        impact: task.impact,
        effort: task.effort,
        manualRank: task.manualRank,
        repeatRule: task.repeatRule,
        repeatInterval: task.repeatInterval,
      })
      .returning({ id: tasks.id });
    if (task.subtasks.length)
      await db.insert(subtasks).values(task.subtasks.map((s) => ({ taskId: next.id, title: s.title, position: s.position })));
    if (task.taskTags.length) await db.insert(taskTags).values(task.taskTags.map((t) => ({ taskId: next.id, tagId: t.tagId })));
    // The completed instance no longer repeats, so it won't spawn twice if re-toggled.
    await db.update(tasks).set({ repeatRule: "none" }).where(eq(tasks.id, id));
  }
  revalidate();
}

export async function setQuadrant(id: number, urgent: boolean, important: boolean) {
  await db.update(tasks).set({ urgent, important }).where(eq(tasks.id, id));
  revalidate();
}

export async function setLevel(id: number, level: number) {
  await db.update(tasks).set({ level: clamp(level, 1, 3) }).where(eq(tasks.id, id));
  revalidate();
}

/** Persist a full manual ordering for the given ids (top to bottom). */
export async function reorderTasks(orderedIds: number[]) {
  if (!orderedIds.length) return;
  await Promise.all(orderedIds.map((id, i) => db.update(tasks).set({ manualRank: i }).where(eq(tasks.id, id))));
  revalidate();
}

// ---- subtasks ----

export async function addSubtask(taskId: number, title: string) {
  if (!title.trim()) return;
  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(${subtasks.position}), -1)` })
    .from(subtasks)
    .where(eq(subtasks.taskId, taskId));
  await db.insert(subtasks).values({ taskId, title: title.trim(), position: Number(max) + 1 });
  revalidate();
}

export async function toggleSubtask(id: number, done: boolean) {
  await db.update(subtasks).set({ done }).where(eq(subtasks.id, id));
  revalidate();
}

export async function deleteSubtask(id: number) {
  await db.delete(subtasks).where(eq(subtasks.id, id));
  revalidate();
}

export async function clearCompleted() {
  await db.delete(tasks).where(and(eq(tasks.status, "done"), inArray(tasks.repeatRule, ["none"])));
  revalidate();
}
