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
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { reorderTasks, setQuadrant } from "@/actions/tasks";
import { isDueToday, isOverdue } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { TaskWithRelations } from "@/db/schema";
import { TaskItem } from "./task-item";

type ViewProps = { tasks: TaskWithRelations[]; onOpen: (t: TaskWithRelations) => void };

function Empty({ text }: { text: string }) {
  return <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">{text}</p>;
}

function DoneSection({ tasks, onOpen }: ViewProps) {
  const [show, setShow] = useState(false);
  if (!tasks.length) return null;
  return (
    <div className="pt-2">
      <button type="button" onClick={() => setShow((s) => !s)} className="text-xs text-muted-foreground hover:text-foreground">
        {show ? "Hide" : "Show"} {tasks.length} completed
      </button>
      {show && (
        <div className="mt-2 space-y-1.5">
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
export function TodayView({ tasks, onOpen }: ViewProps) {
  const open = tasks.filter((t) => t.status === "open");
  const overdue = open.filter((t) => isOverdue(t.dueDate)).sort(byDue);
  const today = open.filter((t) => isDueToday(t.dueDate)).sort((a, b) => a.level - b.level);
  const urgent = open.filter((t) => t.urgent && !isOverdue(t.dueDate) && !isDueToday(t.dueDate)).sort((a, b) => a.level - b.level);
  const done = tasks.filter((t) => t.status === "done" && t.completedAt && isDueToday(t.completedAt.toISOString().slice(0, 10)));
  const empty = !overdue.length && !today.length && !urgent.length;
  return (
    <div className="space-y-5">
      {empty && <Empty text="Nothing due today. Add a due date or mark something urgent to see it here." />}
      {overdue.length > 0 && <Section title="Overdue" tasks={overdue} onOpen={onOpen} tone="danger" />}
      {today.length > 0 && <Section title="Due today" tasks={today} onOpen={onOpen} />}
      {urgent.length > 0 && <Section title="Urgent" tasks={urgent} onOpen={onOpen} />}
      <DoneSection tasks={done} onOpen={onOpen} />
    </div>
  );
}

function Section({ title, tasks, onOpen, tone }: ViewProps & { title: string; tone?: "danger" }) {
  return (
    <section className="space-y-1.5">
      <h2 className={cn("text-xs font-medium uppercase tracking-wide text-muted-foreground", tone === "danger" && "text-red-600 dark:text-red-400")}>
        {title} · {tasks.length}
      </h2>
      {tasks.map((t) => (
        <TaskItem key={t.id} task={t} onOpen={onOpen} />
      ))}
    </section>
  );
}

// ---------- List (P1/P2/P3) ----------
export function ListView({ tasks, onOpen }: ViewProps) {
  const open = tasks.filter((t) => t.status === "open");
  const done = tasks.filter((t) => t.status === "done");
  const groups = [1, 2, 3].map((level) => ({ level, items: open.filter((t) => t.level === level).sort(byDue) }));
  return (
    <div className="space-y-5">
      {!open.length && <Empty text="No open tasks. Add one above." />}
      {groups
        .filter((g) => g.items.length)
        .map((g) => (
          <Section key={g.level} title={g.level === 1 ? "P1 · Highest" : g.level === 2 ? "P2 · Normal" : "P3 · Low"} tasks={g.items} onOpen={onOpen} />
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
      <p className="text-xs text-muted-foreground">Ranked by impact ÷ effort. Edit a task to set both on a 1–5 scale.</p>
      {!open.length && <Empty text="No open tasks." />}
      <div className="space-y-1.5">
        {open.map(({ t, score }) => (
          <TaskItem
            key={t.id}
            task={t}
            onOpen={onOpen}
            trailing={
              <div className="shrink-0 text-right">
                <div className="font-mono text-sm font-semibold tabular-nums">{score.toFixed(2)}</div>
                <div className="text-[10px] text-muted-foreground">
                  {t.impact}i / {t.effort}e
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
function SortableRow({ task, onOpen }: { task: TaskWithRelations; onOpen: (t: TaskWithRelations) => void }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={cn(isDragging && "z-10 opacity-80")}>
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
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const byId = new Map(open.map((t) => [t.id, t]));

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const next = arrayMove(order, order.indexOf(Number(active.id)), order.indexOf(Number(over.id)));
    setOrder(next);
    start(() => reorderTasks(next));
  }

  return (
    <div className="space-y-5">
      <p className="text-xs text-muted-foreground">Drag the handle to put tasks in the order you want to do them.</p>
      {!open.length && <Empty text="No open tasks." />}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          <div className="space-y-1.5">
            {order.map((id) => {
              const t = byId.get(id);
              return t ? <SortableRow key={id} task={t} onOpen={onOpen} /> : null;
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
  { key: "do", urgent: true, important: true, title: "Do first", hint: "Urgent & important", tone: "border-red-500/40 bg-red-500/5" },
  { key: "schedule", urgent: false, important: true, title: "Schedule", hint: "Important, not urgent", tone: "border-blue-500/40 bg-blue-500/5" },
  { key: "delegate", urgent: true, important: false, title: "Delegate / quick", hint: "Urgent, not important", tone: "border-amber-500/40 bg-amber-500/5" },
  { key: "drop", urgent: false, important: false, title: "Later / drop", hint: "Neither", tone: "border-muted bg-muted/30" },
] as const;

function DraggableCard({ task, onOpen }: { task: TaskWithRelations; onOpen: (t: TaskWithRelations) => void }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, isDragging } = useDraggable({ id: task.id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform) }} className={cn(isDragging && "z-10 opacity-80")}>
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

function Quadrant({ q, tasks, onOpen }: { q: (typeof QUADRANTS)[number]; tasks: TaskWithRelations[]; onOpen: (t: TaskWithRelations) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: q.key });
  return (
    <div ref={setNodeRef} className={cn("flex min-h-40 flex-col gap-1.5 rounded-xl border p-3 transition-colors", q.tone, isOver && "ring-2 ring-ring")}>
      <div className="mb-1">
        <div className="text-sm font-semibold">{q.title}</div>
        <div className="text-xs text-muted-foreground">{q.hint}</div>
      </div>
      {tasks.map((t) => (
        <DraggableCard key={t.id} task={t} onOpen={onOpen} />
      ))}
      {!tasks.length && <div className="flex-1 rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">Drop here</div>}
    </div>
  );
}

export function MatrixView({ tasks, onOpen }: ViewProps) {
  const open = tasks.filter((t) => t.status === "open");
  const done = tasks.filter((t) => t.status === "done");
  const [, start] = useTransition();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  );

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over) return;
    const q = QUADRANTS.find((x) => x.key === over.id);
    const task = open.find((t) => t.id === Number(active.id));
    if (!q || !task || (task.urgent === q.urgent && task.important === q.important)) return;
    start(() => setQuadrant(task.id, q.urgent, q.important));
  }

  return (
    <div className="space-y-5">
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="grid gap-3 sm:grid-cols-2">
          {QUADRANTS.map((q) => (
            <Quadrant key={q.key} q={q} onOpen={onOpen} tasks={open.filter((t) => t.urgent === q.urgent && t.important === q.important).sort(byDue)} />
          ))}
        </div>
      </DndContext>
      <DoneSection tasks={done} onOpen={onOpen} />
    </div>
  );
}
