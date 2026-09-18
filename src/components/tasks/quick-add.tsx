"use client";

import { useRef, useTransition } from "react";
import { quickAddTask } from "@/actions/tasks";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export function QuickAdd() {
  const ref = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const title = ref.current?.value.trim();
    if (!title) return;
    if (ref.current) ref.current.value = "";
    start(() => quickAddTask(title));
  }

  return (
    <form onSubmit={submit} className="flex gap-2">
      <Input ref={ref} placeholder="Add a task and press Enter…" aria-label="New task title" disabled={pending} />
      <Button type="submit" size="icon" aria-label="Add task" disabled={pending}>
        <Plus />
      </Button>
    </form>
  );
}
