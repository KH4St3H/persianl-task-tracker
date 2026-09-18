"use client";

import { useTransition } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { setTaskDone } from "@/actions/tasks";
import { formatDue, isOverdue } from "@/lib/dates";
import { describeRepeat } from "@/lib/recurrence";
import { cn } from "@/lib/utils";
import type { TaskWithRelations } from "@/db/schema";
import { Repeat } from "lucide-react";

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

  return (
    <div
      className={cn(
        "group relative flex items-start gap-3 py-2.5 pr-1 transition-opacity duration-300",
        highlight && "-mx-3 rounded-lg bg-marker/70 px-3 dark:bg-marker/40",
        done && "opacity-50",
        pending && "opacity-40",
      )}
    >
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
        <div className={cn("flex items-baseline gap-2", compact && "gap-1.5")}>
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
            {task.subtasks.length > 0 && (
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
      {trailing}
    </div>
  );
}
