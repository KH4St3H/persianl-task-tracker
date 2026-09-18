"use client";

import { useRef, useTransition } from "react";
import { quickAddTask } from "@/actions/tasks";
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
    <form
      onSubmit={submit}
      className="flex items-center gap-2 border-b border-foreground/70 pb-1"
    >
      <Plus className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <input
        ref={ref}
        placeholder="Add a task"
        aria-label="New task"
        disabled={pending}
        className="h-9 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground disabled:opacity-50"
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label="Add with details"
        disabled={pending}
        onClick={() => {
          const title = ref.current?.value ?? "";
          if (ref.current) ref.current.value = "";
          onDetails(title);
        }}
      >
        <SlidersHorizontal /> Details
      </Button>
    </form>
  );
}
