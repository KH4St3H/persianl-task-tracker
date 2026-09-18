"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Project, Tag, TaskWithRelations } from "@/db/schema";
import { cn } from "@/lib/utils";
import { QuickAdd } from "./quick-add";
import { TaskEditor } from "./task-editor";
import { ListView, MatrixView, RankedView, ScoreView, TodayView } from "./views";

export type ViewKey = "today" | "list" | "matrix" | "ranked" | "score";

const TABS: { key: ViewKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "list", label: "List" },
  { key: "matrix", label: "Matrix" },
  { key: "ranked", label: "Ranked" },
  { key: "score", label: "Score" },
];

const selectClass = "h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none dark:bg-input/30";

export function TasksBoard({
  tasks,
  projects,
  tags,
  view,
  projectId,
  tagId,
}: {
  tasks: TaskWithRelations[];
  projects: Project[];
  tags: Tag[];
  view: ViewKey;
  projectId: number | null;
  tagId: number | null;
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<number | null>(null);
  // Always render the freshest copy of the task being edited (after revalidation).
  const editing = editingId ? (tasks.find((t) => t.id === editingId) ?? null) : null;

  const filtered = tasks.filter(
    (t) => (projectId ? t.projectId === projectId : true) && (tagId ? t.taskTags.some((tt) => tt.tagId === tagId) : true),
  );

  const href = (v: ViewKey, p = projectId, g = tagId) => {
    const sp = new URLSearchParams({ view: v });
    if (p) sp.set("project", String(p));
    if (g) sp.set("tag", String(g));
    return `/tasks?${sp}`;
  };

  const View = { today: TodayView, list: ListView, matrix: MatrixView, ranked: RankedView, score: ScoreView }[view];

  return (
    <div className="space-y-4">
      <QuickAdd />

      <div className="flex flex-wrap items-center gap-2">
        <nav className="inline-flex h-8 items-center rounded-lg bg-muted p-[3px] text-muted-foreground">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={href(t.key)}
              className={cn(
                "rounded-md px-2.5 py-1 text-sm transition-colors",
                view === t.key ? "bg-background text-foreground shadow-sm" : "hover:text-foreground",
              )}
            >
              {t.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex gap-2">
          <select aria-label="Filter by project" className={selectClass} value={projectId ?? ""} onChange={(e) => router.push(href(view, Number(e.target.value) || null))}>
            <option value="">All projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {tags.length > 0 && (
            <select aria-label="Filter by tag" className={selectClass} value={tagId ?? ""} onChange={(e) => router.push(href(view, projectId, Number(e.target.value) || null))}>
              <option value="">All tags</option>
              {tags.map((t) => (
                <option key={t.id} value={t.id}>
                  #{t.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <View tasks={filtered} onOpen={(t) => setEditingId(t.id)} />

      <TaskEditor task={editing} projects={projects} tags={tags} onClose={() => setEditingId(null)} />
    </div>
  );
}
