import { db } from "@/db";
import { tasks } from "@/db/schema";
import { asc, desc } from "drizzle-orm";
import type { TaskWithRelations } from "@/db/schema";

export async function getAllTasks(): Promise<TaskWithRelations[]> {
  return db.query.tasks.findMany({
    with: {
      project: true,
      subtasks: { orderBy: (s, { asc }) => [asc(s.position), asc(s.id)] },
      taskTags: { with: { tag: true } },
    },
    orderBy: [asc(tasks.status), asc(tasks.manualRank), desc(tasks.createdAt)],
  });
}

export async function getProjects() {
  return db.query.projects.findMany({ orderBy: (p, { asc }) => [asc(p.name)] });
}

export async function getTags() {
  return db.query.tags.findMany({ orderBy: (t, { asc }) => [asc(t.name)] });
}
