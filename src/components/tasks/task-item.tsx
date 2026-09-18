"use client";

import { useTransition } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { setTaskDone } from "@/actions/tasks";
import { formatDue, isOverdue } from "@/lib/dates";
import { describeRepeat } from "@/lib/recurrence";
import { cn } from "@/lib/utils";
import type { TaskWithRelations } from "@/db/schema";
import { Repeat } from "lucide-react";

export function levelLabel(level: number) {
  return `P${level}`;
}

export function levelClass(level: number) {
  return level === 1
    ? "bg-red-500/15 text-red-700 dark:text-red-300 border-transparent"
    : level === 2
      ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-transparent"
      : "bg-muted text-muted-foreground border-transparent";
}

export function TaskItem({
  task,
  onOpen,
  compact = false,
  trailing,
}: {
  task: TaskWithRelations;
  onOpen: (t: TaskWithRelations) => void;
  compact?: boolean;
  trailing?: React.ReactNode;
}) {
  const [pending, start] = useTransition();
  const done = task.status === "done";
  const subDone = task.subtasks.filter((s) => s.done).length;
  const overdue = !done && isOverdue(task.dueDate);

  return (
    <div
      className={cn(
        "group flex items-start gap-3 rounded-lg border bg-card px-3 py-2 transition-colors hover:bg-muted/40",
        done && "opacity-60",
        pending && "opacity-50",
      )}
    >
      <Checkbox
        className="mt-0.5"
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
          className={cn("truncate text-sm font-medium", done && "line-through")}
        >
          {task.title}
        </div>
        {!compact && (
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <Badge variant="outline" className={levelClass(task.level)}>
              {levelLabel(task.level)}
            </Badge>
            {task.dueDate && (
              <span
                className={cn(
                  overdue && "font-medium text-red-600 dark:text-red-400",
                )}
              >
                {overdue ? "Overdue · " : ""}
                {formatDue(task.dueDate)}
              </span>
            )}
            {task.project && (
              <span className="inline-flex items-center gap-1">
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
                {subDone}/{task.subtasks.length} steps
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
