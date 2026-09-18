"use client";

import { useState, useTransition } from "react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { reorderTasks, setQuadrant } from "@/actions/tasks";
import { dateInTZ, isDueToday, isOverdue } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { TaskWithRelations } from "@/db/schema";
import type { CalendarEvent } from "@/lib/google";
import { TaskItem } from "./task-item";

type ViewProps = {
  tasks: TaskWithRelations[];
  onOpen: (t: TaskWithRelations) => void;
};

function Empty({ text }: { text: string }) {
  return <p className="py-6 text-[15px] text-muted-foreground">{text}</p>;
}

function DoneSection({ tasks, onOpen }: ViewProps) {
  const [show, setShow] = useState(false);
  if (!tasks.length) return null;
  return (
    <div className="pt-2">
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        {show ? "Hide" : "Show"} {tasks.length} done
      </button>
      {show && (
        <div className="mt-2 divide-y divide-border">
          {tasks.map((t) => (
            <TaskItem key={t.id} task={t} onOpen={onOpen} compact />
          ))}
        </div>
      )}
    </div>
  );
}

const byDue = (a: TaskWithRelations, b: TaskWithRelations) =>
  (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999") || a.level - b.level;

// ---------- Today ----------
function CalendarSection({ events }: { events: CalendarEvent[] }) {
  return (
    <section>
      <h2 className="font-display text-lg font-medium">On your calendar</h2>
      {!events.length && (
        <p className="py-2 text-[15px] text-muted-foreground">
          No events today.
        </p>
      )}
      <ul className="divide-y divide-border">
        {events.map((e) => (
          <li key={e.id}>
            <a
              href={e.link}
              target="_blank"
              rel="noreferrer"
              className="flex items-baseline gap-3 py-2 text-[15px] hover:text-foreground"
            >
              <span className="w-24 shrink-0 text-[13px] tabular-nums text-muted-foreground">
                {e.timeLabel}
              </span>
              <span className="min-w-0 flex-1 truncate">{e.title}</span>
              <span className="hidden shrink-0 text-[13px] text-muted-foreground sm:inline">
                {e.calendar}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function TodayView({
  tasks,
  onOpen,
  events = null,
}: ViewProps & { events?: CalendarEvent[] | null }) {
  const open = tasks.filter((t) => t.status === "open");
  const overdue = open.filter((t) => isOverdue(t.dueDate)).sort(byDue);
  const today = open
    .filter((t) => isDueToday(t.dueDate))
    .sort((a, b) => a.level - b.level);
  const urgent = open
    .filter((t) => t.urgent && !isOverdue(t.dueDate) && !isDueToday(t.dueDate))
    .sort((a, b) => a.level - b.level);
  const done = tasks.filter(
    (t) =>
      t.status === "done" &&
      t.completedAt &&
      isDueToday(dateInTZ(t.completedAt)),
  );
  const empty = !overdue.length && !today.length && !urgent.length;
  return (
    <div className="space-y-5">
      {events && <CalendarSection events={events} />}
      {empty && (
        <Empty text="Nothing is due today. Pick something from the List, or give a task a due date." />
      )}
      {overdue.length > 0 && (
        <Section
          title="Overdue"
          tasks={overdue}
          onOpen={onOpen}
          tone="danger"
          highlightFirst
        />
      )}
      {today.length > 0 && (
        <Section
          title="Due today"
          tasks={today}
          onOpen={onOpen}
          highlightFirst={!overdue.length}
        />
      )}
      {urgent.length > 0 && (
        <Section title="Marked urgent" tasks={urgent} onOpen={onOpen} />
      )}
      <DoneSection tasks={done} onOpen={onOpen} />
    </div>
  );
}

function Section({
  title,
  tasks,
  onOpen,
  tone,
  highlightFirst = false,
}: ViewProps & { title: string; tone?: "danger"; highlightFirst?: boolean }) {
  return (
    <section>
      <h2
        className={cn(
          "font-display text-lg font-medium",
          tone === "danger" && "text-overdue",
        )}
      >
        {title} <span className="text-muted-foreground">({tasks.length})</span>
      </h2>
      <div className="divide-y divide-border">
        {tasks.map((t, i) => (
          <TaskItem
            key={t.id}
            task={t}
            onOpen={onOpen}
            highlight={highlightFirst && i === 0}
          />
        ))}
      </div>
    </section>
  );
}

// ---------- List (P1/P2/P3) ----------
export function ListView({ tasks, onOpen }: ViewProps) {
  const open = tasks.filter((t) => t.status === "open");
  const done = tasks.filter((t) => t.status === "done");
  const groups = [1, 2, 3].map((level) => ({
    level,
    items: open.filter((t) => t.level === level).sort(byDue),
  }));
  return (
    <div className="space-y-5">
      {!open.length && <Empty text="No open tasks. Add one above." />}
      {groups
        .filter((g) => g.items.length)
        .map((g) => (
          <Section
            key={g.level}
            title={
              g.level === 1
                ? "P1, do these first"
                : g.level === 2
                  ? "P2"
                  : "P3, when there is time"
            }
            tasks={g.items}
            onOpen={onOpen}
          />
        ))}
      <DoneSection tasks={done} onOpen={onOpen} />
    </div>
  );
}

// ---------- Score (impact / effort) ----------
export function ScoreView({ tasks, onOpen }: ViewProps) {
  const open = tasks
    .filter((t) => t.status === "open")
    .map((t) => ({ t, score: t.impact / t.effort }))
    .sort((a, b) => b.score - a.score || byDue(a.t, b.t));
  const done = tasks.filter((t) => t.status === "done");
  return (
    <div className="space-y-5">
      {!open.length && <Empty text="No open tasks." />}
      <div className="divide-y divide-border">
        {open.map(({ t, score }) => (
          <TaskItem
            key={t.id}
            task={t}
            onOpen={onOpen}
            trailing={
              <div className="shrink-0 text-right">
                <div className="font-display text-base font-semibold tabular-nums">
                  {score.toFixed(2)}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {t.impact} impact, {t.effort} effort
                </div>
              </div>
            }
          />
        ))}
      </div>
      <DoneSection tasks={done} onOpen={onOpen} />
    </div>
  );
}

// ---------- Ranked (manual drag) ----------
function SortableRow({
  task,
  onOpen,
}: {
  task: TaskWithRelations;
  onOpen: (t: TaskWithRelations) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(isDragging && "z-10 opacity-80")}
    >
      <TaskItem
        task={task}
        onOpen={onOpen}
        trailing={
          <button
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            className="cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing"
            aria-label="Drag to reorder"
          >
            <GripVertical className="size-4" />
          </button>
        }
      />
    </div>
  );
}

export function RankedView({ tasks, onOpen }: ViewProps) {
  const open = tasks.filter((t) => t.status === "open");
  const done = tasks.filter((t) => t.status === "done");
  const [order, setOrder] = useState<number[]>(open.map((t) => t.id));
  const [prevTasks, setPrevTasks] = useState(tasks);
  const [, start] = useTransition();
  if (prevTasks !== tasks) {
    // Server data changed (new task, completion, etc.): resync local order during render.
    setPrevTasks(tasks);
    setOrder(open.map((t) => t.id));
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const byId = new Map(open.map((t) => [t.id, t]));

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const next = arrayMove(
      order,
      order.indexOf(Number(active.id)),
      order.indexOf(Number(over.id)),
    );
    setOrder(next);
    start(() => reorderTasks(next));
  }

  return (
    <div className="space-y-5">
      {!open.length && <Empty text="No open tasks." />}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          <div className="divide-y divide-border">
            {order.map((id) => {
              const t = byId.get(id);
              return t ? (
                <SortableRow key={id} task={t} onOpen={onOpen} />
              ) : null;
            })}
          </div>
        </SortableContext>
      </DndContext>
      <DoneSection tasks={done} onOpen={onOpen} />
    </div>
  );
}

// ---------- Matrix (Eisenhower) ----------
const QUADRANTS = [
  {
    key: "do",
    urgent: true,
    important: true,
    title: "Do first",
    hint: "Urgent and important",
    tone: "bg-marker/40 dark:bg-marker/20",
  },
  {
    key: "schedule",
    urgent: false,
    important: true,
    title: "Schedule",
    hint: "Important, not urgent",
    tone: "",
  },
  {
    key: "delegate",
    urgent: true,
    important: false,
    title: "Get it off the desk",
    hint: "Urgent, not important",
    tone: "",
  },
  {
    key: "drop",
    urgent: false,
    important: false,
    title: "Later, or never",
    hint: "Neither",
    tone: "",
  },
] as const;

function DraggableCard({
  task,
  onOpen,
}: {
  task: TaskWithRelations;
  onOpen: (t: TaskWithRelations) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    isDragging,
  } = useDraggable({ id: task.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn(isDragging && "z-10 opacity-80")}
    >
      <TaskItem
        task={task}
        onOpen={onOpen}
        compact
        trailing={
          <button
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            className="cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing"
            aria-label="Drag to another quadrant"
          >
            <GripVertical className="size-4" />
          </button>
        }
      />
    </div>
  );
}

function Quadrant({
  q,
  tasks,
  onOpen,
}: {
  q: (typeof QUADRANTS)[number];
  tasks: TaskWithRelations[];
  onOpen: (t: TaskWithRelations) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: q.key });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-44 flex-col p-3 transition-colors",
        q.tone,
        isOver && "bg-muted",
      )}
    >
      <div className="mb-1">
        <div className="font-display text-lg font-medium leading-tight">
          {q.title}
        </div>
        <div className="text-[13px] text-muted-foreground">{q.hint}</div>
      </div>
      {tasks.map((t) => (
        <DraggableCard key={t.id} task={t} onOpen={onOpen} />
      ))}
      {!tasks.length && (
        <div className="flex-1 py-3 text-[13px] text-muted-foreground">
          Drop a task here
        </div>
      )}
    </div>
  );
}

export function MatrixView({ tasks, onOpen }: ViewProps) {
  const open = tasks.filter((t) => t.status === "open");
  const done = tasks.filter((t) => t.status === "done");
  const [, start] = useTransition();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    }),
  );

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over) return;
    const q = QUADRANTS.find((x) => x.key === over.id);
    const task = open.find((t) => t.id === Number(active.id));
    if (
      !q ||
      !task ||
      (task.urgent === q.urgent && task.important === q.important)
    )
      return;
    start(() => setQuadrant(task.id, q.urgent, q.important));
  }

  return (
    <div className="space-y-5">
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 border border-foreground/60 sm:grid-cols-2 [&>*:nth-child(odd)]:sm:border-r [&>*:nth-child(-n+2)]:sm:border-b [&>*]:border-foreground/60 [&>*:not(:last-child)]:border-b [&>*:not(:last-child)]:sm:border-b-0 [&>*:nth-child(-n+2)]:sm:border-b">
          {QUADRANTS.map((q) => (
            <Quadrant
              key={q.key}
              q={q}
              onOpen={onOpen}
              tasks={open
                .filter(
                  (t) => t.urgent === q.urgent && t.important === q.important,
                )
                .sort(byDue)}
            />
          ))}
        </div>
      </DndContext>
      <DoneSection tasks={done} onOpen={onOpen} />
    </div>
  );
}
