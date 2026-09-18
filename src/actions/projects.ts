"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { projects, tags } from "@/db/schema";

const revalidate = () => {
  revalidatePath("/tasks");
  revalidatePath("/projects");
};

export async function createProject(name: string, color: string) {
  if (!name.trim()) return;
  await db.insert(projects).values({ name: name.trim(), color: color || "#6366f1" });
  revalidate();
}

export async function updateProject(id: number, name: string, color: string) {
  if (!name.trim()) return;
  await db.update(projects).set({ name: name.trim(), color }).where(eq(projects.id, id));
  revalidate();
}

export async function deleteProject(id: number) {
  await db.delete(projects).where(eq(projects.id, id));
  revalidate();
}

export async function createTag(name: string) {
  const n = name.trim().toLowerCase();
  if (!n) return;
  await db.insert(tags).values({ name: n }).onConflictDoNothing();
  revalidate();
}

export async function deleteTag(id: number) {
  await db.delete(tags).where(eq(tags.id, id));
  revalidate();
}
