"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Project, Tag, TaskWithRelations } from "@/db/schema";
import type { CalendarEvent } from "@/lib/google";
import { APP_TZ, isDueToday, isOverdue } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { QuickAdd } from "./quick-add";
import { TaskEditor } from "./task-editor";
import {
  ListView,
  MatrixView,
  RankedView,
  ScoreView,
  TodayView,
} from "./views";

export type ViewKey = "today" | "list" | "matrix" | "ranked" | "score";

const TABS: { key: ViewKey; label: string; blurb: string }[] = [
  { key: "today", label: "Today", blurb: "" },
  { key: "list", label: "List", blurb: "Grouped by level, soonest due first." },
  {
    key: "matrix",
    label: "Matrix",
    blurb: "Drag tasks between urgent and important. Do the top-left first.",
  },
  {
    key: "ranked",
    label: "Ranked",
    blurb: "Your own order. Drag the handle to change it.",
  },
  {
    key: "score",
    label: "Score",
    blurb: "Impact divided by effort. High scores are quick wins.",
  },
];

const selectClass =
  "h-8 rounded-md border border-input bg-transparent px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40";

function joinCounts(parts: string[]) {
  if (!parts.length)
    return "Nothing on the schedule. A good day to pick from the list.";
  if (parts.length === 1) return `${parts[0]}.`;
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}.`;
}

function TodayHero({
  tasks,
  events,
}: {
  tasks: TaskWithRelations[];
  events: CalendarEvent[] | null;
}) {
  const now = new Date();
  const weekday = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    timeZone: APP_TZ,
  }).format(now);
  const dayMonth = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    timeZone: APP_TZ,
  }).format(now);
  const open = tasks.filter((t) => t.status === "open");
  const due = open.filter((t) => isDueToday(t.dueDate)).length;
  const overdue = open.filter((t) => isOverdue(t.dueDate)).length;
  const meetings = events?.filter((e) => !e.allDay).length ?? 0;
  const parts = [
    due ? `${due} due today` : "",
    overdue ? `${overdue} overdue` : "",
    events
      ? meetings
        ? `${meetings} ${meetings === 1 ? "meeting" : "meetings"}`
        : ""
      : "",
  ].filter(Boolean);
  return (
    <div className="space-y-1">
      <h1 className="font-display text-[2.4rem] font-semibold leading-none tracking-tight sm:text-5xl">
        {weekday} {dayMonth}
      </h1>
      <p className="text-[15px] text-muted-foreground">{joinCounts(parts)}</p>
    </div>
  );
}

export function TasksBoard({
  tasks,
  projects,
  tags,
  view,
  projectId,
  tagId,
  events,
}: {
  tasks: TaskWithRelations[];
  projects: Project[];
  tags: Tag[];
  view: ViewKey;
  projectId: number | null;
  tagId: number | null;
  events: CalendarEvent[] | null;
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<number | null>(null);
  // Title typed so far when the "add with details" panel is open; null when closed.
  const [draft, setDraft] = useState<string | null>(null);
  // Always render the freshest copy of the task being edited (after revalidation).
  const editing = editingId
    ? (tasks.find((t) => t.id === editingId) ?? null)
    : null;

  const filtered = tasks.filter(
    (t) =>
      (projectId ? t.projectId === projectId : true) &&
      (tagId ? t.taskTags.some((tt) => tt.tagId === tagId) : true),
  );

  const href = (v: ViewKey, p = projectId, g = tagId) => {
    const sp = new URLSearchParams({ view: v });
    if (p) sp.set("project", String(p));
    if (g) sp.set("tag", String(g));
    return `/tasks?${sp}`;
  };

  const View = {
    today: TodayView,
    list: ListView,
    matrix: MatrixView,
    ranked: RankedView,
    score: ScoreView,
  }[view];
  const tab = TABS.find((t) => t.key === view)!;

  return (
    <div className="space-y-7">
      {view === "today" ? (
        <TodayHero tasks={filtered} events={events} />
      ) : (
        <div className="space-y-1">
          <h1 className="font-display text-[2.4rem] font-semibold leading-none tracking-tight sm:text-5xl">
            {tab.label}
          </h1>
          <p className="text-[15px] text-muted-foreground">{tab.blurb}</p>
        </div>
      )}

      <QuickAdd
        onDetails={(title) => {
          setEditingId(null);
          setDraft(title);
        }}
      />

      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <nav
          aria-label="Lens"
          className="flex gap-5 font-display text-[17px] font-medium"
        >
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={href(t.key)}
              aria-current={view === t.key ? "page" : undefined}
              className={cn(
                "border-b-[3px] pb-0.5",
                view === t.key
                  ? "border-marker text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </Link>
          ))}
        </nav>
        <div className="flex gap-2">
          <select
            aria-label="Filter by project"
            className={selectClass}
            value={projectId ?? ""}
            onChange={(e) =>
              router.push(href(view, Number(e.target.value) || null))
            }
          >
            <option value="">All projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {tags.length > 0 && (
            <select
              aria-label="Filter by tag"
              className={selectClass}
              value={tagId ?? ""}
              onChange={(e) =>
                router.push(
                  href(view, projectId, Number(e.target.value) || null),
                )
              }
            >
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

      {view === "today" ? (
        <TodayView
          tasks={filtered}
          onOpen={(t) => setEditingId(t.id)}
          events={events}
        />
      ) : (
        <View tasks={filtered} onOpen={(t) => setEditingId(t.id)} />
      )}

      <TaskEditor
        task={editing}
        draft={draft}
        projects={projects}
        tags={tags}
        onClose={() => {
          setEditingId(null);
          setDraft(null);
        }}
      />
    </div>
  );
}
