"use client";

import { useState, useTransition } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { setTaskDone, toggleSubtask } from "@/actions/tasks";
import { formatDue, isOverdue } from "@/lib/dates";
import { describeRepeat } from "@/lib/recurrence";
import { cn } from "@/lib/utils";
import type { TaskWithRelations } from "@/db/schema";
import { ChevronDown, Repeat } from "lucide-react";

/** Priority level mark: P1 solid ink, P2 outlined, P3 plain. The weight of the mark is the information. */
export function LevelMark({
  level,
  className,
}: {
  level: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 min-w-7 items-center justify-center rounded-md px-1.5 font-display text-[11px] font-semibold leading-none",
        level === 1 && "bg-foreground text-background",
        level === 2 && "border border-foreground/60 text-foreground",
        level === 3 && "text-muted-foreground",
        className,
      )}
    >
      P{level}
    </span>
  );
}

export function TaskItem({
  task,
  onOpen,
  compact = false,
  trailing,
  highlight = false,
}: {
  task: TaskWithRelations;
  onOpen: (t: TaskWithRelations) => void;
  compact?: boolean;
  trailing?: React.ReactNode;
  /** The one task to do next: gets the marker wash. */
  highlight?: boolean;
}) {
  const [pending, start] = useTransition();
  const done = task.status === "done";
  const subDone = task.subtasks.filter((s) => s.done).length;
  const overdue = !done && isOverdue(task.dueDate);
  const hasSteps = !compact && task.subtasks.length > 0;
  // Steps stay open while the task is open; a done task tucks them away.
  const [stepsOpen, setStepsOpen] = useState(!done);

  return (
    <div
      className={cn(
        "group relative py-2.5 pr-1 transition-opacity duration-300",
        highlight && "-mx-3 rounded-lg bg-marker/70 px-3 dark:bg-marker/40",
        done && "opacity-50",
        pending && "opacity-40",
      )}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          className="mt-[3px] size-[18px] rounded-full border-foreground/50 data-checked:border-foreground"
          checked={done}
          onCheckedChange={(checked) =>
            start(() => setTaskDone(task.id, !!checked))
          }
          aria-label={done ? "Mark as not done" : "Mark as done"}
        />
        <button
          type="button"
          onClick={() => onOpen(task)}
          className="min-w-0 flex-1 text-left"
        >
          <div
            className={cn("flex items-baseline gap-2", compact && "gap-1.5")}
          >
            <span
              className={cn(
                "min-w-0 flex-1 truncate text-[15px] leading-6",
                done && "line-through decoration-foreground/50",
              )}
            >
              {task.title}
            </span>
            {!compact && (
              <LevelMark
                level={task.level}
                className="shrink-0 translate-y-[-1px]"
              />
            )}
          </div>
          {!compact && (
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[13px] text-muted-foreground">
              {task.dueDate && (
                <span className={cn(overdue && "font-medium text-overdue")}>
                  {overdue
                    ? `Was due ${formatDue(task.dueDate)}`
                    : formatDue(task.dueDate)}
                </span>
              )}
              {task.project && (
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="size-2 rounded-full"
                    style={{ background: task.project.color }}
                  />
                  {task.project.name}
                </span>
              )}
              {task.taskTags.map((tt) => (
                <span key={tt.tagId}>#{tt.tag.name}</span>
              ))}
              {hasSteps && (
                <span>
                  {subDone} of {task.subtasks.length} steps
                </span>
              )}
              {task.repeatRule !== "none" && (
                <span className="inline-flex items-center gap-1">
                  <Repeat className="size-3" />
                  {describeRepeat(task.repeatRule, task.repeatInterval)}
                </span>
              )}
            </div>
          )}
        </button>
        {hasSteps && (
          <button
            type="button"
            onClick={() => setStepsOpen((o) => !o)}
            aria-expanded={stepsOpen}
            aria-label={stepsOpen ? "Hide steps" : "Show steps"}
            className="mt-1 rounded p-0.5 text-muted-foreground hover:text-foreground"
          >
            <ChevronDown
              className={cn(
                "size-4 transition-transform",
                stepsOpen && "rotate-180",
              )}
            />
          </button>
        )}
        {trailing}
      </div>
      {hasSteps && stepsOpen && (
        <ul className="mt-1 space-y-1 pl-[30px]">
          {task.subtasks.map((s) => (
            <li key={s.id} className="flex items-center gap-2.5">
              <Checkbox
                className="size-4 rounded-full border-foreground/40 data-checked:border-foreground"
                checked={s.done}
                onCheckedChange={(c) => start(() => toggleSubtask(s.id, !!c))}
                aria-label={
                  s.done
                    ? `Mark step "${s.title}" as not done`
                    : `Mark step "${s.title}" as done`
                }
              />
              <span
                className={cn(
                  "text-[14px] leading-5",
                  s.done && "text-muted-foreground line-through",
                )}
              >
                {s.title}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
