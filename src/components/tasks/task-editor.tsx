"use client";

import { useState, useTransition } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  addSubtask,
  createTask,
  deleteSubtask,
  deleteTask,
  toggleSubtask,
  updateTask,
  type TaskInput,
} from "@/actions/tasks";
import {
  REPEAT_RULES,
  type Project,
  type RepeatRule,
  type Tag,
  type TaskWithRelations,
} from "@/db/schema";
import { Trash2, X } from "lucide-react";

const selectClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

type EditorProps = { projects: Project[]; tags: Tag[]; onClose: () => void };

/**
 * Side panel for editing an existing task (`task` set) or creating a new one with
 * full details (`draft` set to the title typed so far, possibly "").
 */
export function TaskEditor({
  task,
  draft,
  projects,
  tags,
  onClose,
}: EditorProps & { task: TaskWithRelations | null; draft: string | null }) {
  const open = !!task || draft !== null;
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{task ? "Edit task" : "New task"}</SheetTitle>
          <SheetDescription className="sr-only">
            {task
              ? "Edit task details and priority."
              : "Fill in task details and priority before creating it."}
          </SheetDescription>
        </SheetHeader>
        {open && (
          <EditorForm
            key={task ? task.id : "new"}
            task={task}
            initialTitle={draft ?? ""}
            projects={projects}
            tags={tags}
            onClose={onClose}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function EditorForm({
  task,
  initialTitle,
  projects,
  tags,
  onClose,
}: EditorProps & { task: TaskWithRelations | null; initialTitle: string }) {
  const isNew = !task;
  const [form, setForm] = useState<TaskInput>(() =>
    task
      ? {
          title: task.title,
          notes: task.notes,
          dueDate: task.dueDate,
          projectId: task.projectId,
          urgent: task.urgent,
          important: task.important,
          level: task.level,
          impact: task.impact,
          effort: task.effort,
          repeatRule: task.repeatRule,
          repeatInterval: task.repeatInterval,
          tagIds: task.taskTags.map((t) => t.tagId),
        }
      : {
          title: initialTitle,
          notes: "",
          dueDate: null,
          projectId: null,
          level: 2,
          impact: 3,
          effort: 3,
          repeatRule: "none",
          repeatInterval: 1,
          tagIds: [],
        },
  );
  const [newSub, setNewSub] = useState("");
  // Subtasks typed before the task exists (create mode only); saved together with the task.
  const [draftSubs, setDraftSubs] = useState<string[]>([]);
  const [pending, start] = useTransition();

  const set = <K extends keyof TaskInput>(k: K, v: TaskInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  function save() {
    if (!form.title.trim()) return;
    start(async () => {
      if (task) await updateTask(task.id, form);
      else await createTask({ ...form, subtasks: draftSubs });
      onClose();
    });
  }

  function remove() {
    if (!task) return;
    if (!confirm("Delete this task?")) return;
    start(async () => {
      await deleteTask(task.id);
      onClose();
    });
  }

  function submitSubtask(e: React.FormEvent) {
    e.preventDefault();
    const t = newSub.trim();
    if (!t) return;
    setNewSub("");
    if (task) start(() => addSubtask(task.id, t));
    else setDraftSubs((d) => [...d, t]);
  }

  return (
    <div className="flex flex-col gap-4 px-4 pb-4">
      <div className="space-y-1.5">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          rows={3}
          value={form.notes ?? ""}
          onChange={(e) => set("notes", e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="due">Due date</Label>
          <Input
            id="due"
            type="date"
            value={form.dueDate ?? ""}
            onChange={(e) => set("dueDate", e.target.value || null)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="project">Project</Label>
          <select
            id="project"
            className={selectClass}
            value={form.projectId ?? ""}
            onChange={(e) =>
              set("projectId", e.target.value ? Number(e.target.value) : null)
            }
          >
            <option value="">None</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {tags.length > 0 && (
        <div className="space-y-1.5">
          <Label>Tags</Label>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t) => {
              const on = form.tagIds?.includes(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() =>
                    set(
                      "tagIds",
                      on
                        ? (form.tagIds ?? []).filter((id) => id !== t.id)
                        : [...(form.tagIds ?? []), t.id],
                    )
                  }
                  className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${on ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                >
                  #{t.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <Separator />
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Priority
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="level">Level</Label>
          <select
            id="level"
            className={selectClass}
            value={form.level ?? 2}
            onChange={(e) => set("level", Number(e.target.value))}
          >
            <option value={1}>P1 – Highest</option>
            <option value={2}>P2 – Normal</option>
            <option value={3}>P3 – Low</option>
          </select>
        </div>
        <div className="flex flex-col justify-end gap-2 pb-1">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={!!form.urgent}
              onCheckedChange={(c) => set("urgent", !!c)}
            />{" "}
            Urgent
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={!!form.important}
              onCheckedChange={(c) => set("important", !!c)}
            />{" "}
            Important
          </label>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="impact">Impact (1–5)</Label>
          <Input
            id="impact"
            type="number"
            min={1}
            max={5}
            value={form.impact ?? 3}
            onChange={(e) => set("impact", Number(e.target.value))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="effort">Effort (1–5)</Label>
          <Input
            id="effort"
            type="number"
            min={1}
            max={5}
            value={form.effort ?? 3}
            onChange={(e) => set("effort", Number(e.target.value))}
          />
        </div>
      </div>

      <Separator />
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="repeat">Repeat</Label>
          <select
            id="repeat"
            className={selectClass}
            value={form.repeatRule ?? "none"}
            onChange={(e) => set("repeatRule", e.target.value as RepeatRule)}
          >
            {REPEAT_RULES.map((r) => (
              <option key={r} value={r}>
                {r === "none"
                  ? "Never"
                  : r === "every_n_days"
                    ? "Every N days"
                    : r[0].toUpperCase() + r.slice(1)}
              </option>
            ))}
          </select>
        </div>
        {form.repeatRule === "every_n_days" && (
          <div className="space-y-1.5">
            <Label htmlFor="interval">Every N days</Label>
            <Input
              id="interval"
              type="number"
              min={1}
              value={form.repeatInterval ?? 1}
              onChange={(e) => set("repeatInterval", Number(e.target.value))}
            />
          </div>
        )}
      </div>

      <Separator />
      <div className="space-y-2">
        <Label>Subtasks</Label>
        <ul className="space-y-1">
          {draftSubs.map((title, i) => (
            <li key={`draft-${i}`} className="flex items-center gap-2 text-sm">
              <Checkbox disabled />
              <span className="flex-1">{title}</span>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="Remove subtask"
                onClick={() => setDraftSubs((d) => d.filter((_, j) => j !== i))}
              >
                <X />
              </Button>
            </li>
          ))}
          {(task?.subtasks ?? []).map((s) => (
            <li key={s.id} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={s.done}
                onCheckedChange={(c) => start(() => toggleSubtask(s.id, !!c))}
              />
              <span
                className={`flex-1 ${s.done ? "line-through text-muted-foreground" : ""}`}
              >
                {s.title}
              </span>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="Remove subtask"
                onClick={() => start(() => deleteSubtask(s.id))}
              >
                <X />
              </Button>
            </li>
          ))}
        </ul>
        <form className="flex gap-2" onSubmit={submitSubtask}>
          <Input
            value={newSub}
            onChange={(e) => setNewSub(e.target.value)}
            placeholder="Add a step…"
          />
          <Button type="submit" variant="outline" size="sm">
            Add
          </Button>
        </form>
      </div>

      <div className="mt-2 flex items-center justify-between">
        {isNew ? (
          <span />
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive"
            onClick={remove}
            disabled={pending}
          >
            <Trash2 /> Delete
          </Button>
        )}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={save}
            disabled={pending || !form.title.trim()}
          >
            {isNew ? "Create task" : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}
