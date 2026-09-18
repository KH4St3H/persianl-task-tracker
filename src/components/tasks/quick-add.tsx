"use client";

import { useRef, useTransition } from "react";
import { quickAddTask } from "@/actions/tasks";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, SlidersHorizontal } from "lucide-react";

export function QuickAdd({
  onDetails,
}: {
  onDetails: (title: string) => void;
}) {
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
      <Input
        ref={ref}
        placeholder="Add a task and press Enter…"
        aria-label="New task title"
        disabled={pending}
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Add with details"
        title="Add with details"
        disabled={pending}
        onClick={() => {
          const title = ref.current?.value ?? "";
          if (ref.current) ref.current.value = "";
          onDetails(title);
        }}
      >
        <SlidersHorizontal />
      </Button>
      <Button
        type="submit"
        size="icon"
        aria-label="Add task"
        disabled={pending}
      >
        <Plus />
      </Button>
    </form>
  );
}
