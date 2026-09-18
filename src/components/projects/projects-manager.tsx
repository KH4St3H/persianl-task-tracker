"use client";

import { useState, useTransition } from "react";
import { createProject, createTag, deleteProject, deleteTag, updateProject } from "@/actions/projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Project, Tag } from "@/db/schema";
import { Trash2 } from "lucide-react";

const COLORS = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#0ea5e9", "#ef4444", "#8b5cf6", "#64748b"];

export function ProjectsManager({ projects, tags }: { projects: Project[]; tags: Tag[] }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [tag, setTag] = useState("");
  const [pending, start] = useTransition();

  return (
    <div className="grid gap-8 sm:grid-cols-2">
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Projects</h2>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            const n = name;
            setName("");
            start(() => createProject(n, color));
          }}
        >
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New project" />
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-8 w-10 cursor-pointer rounded border bg-transparent" aria-label="Project color" />
          <Button type="submit" disabled={pending}>
            Add
          </Button>
        </form>
        <ul className="space-y-1.5">
          {projects.map((p) => (
            <li key={p.id} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
              <input
                type="color"
                defaultValue={p.color}
                onBlur={(e) => e.target.value !== p.color && start(() => updateProject(p.id, p.name, e.target.value))}
                className="size-5 cursor-pointer rounded-full border-0 bg-transparent p-0"
                aria-label="Change color"
              />
              <input
                defaultValue={p.name}
                onBlur={(e) => e.target.value.trim() && e.target.value !== p.name && start(() => updateProject(p.id, e.target.value, p.color))}
                className="flex-1 bg-transparent outline-none"
                aria-label="Project name"
              />
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="Delete project"
                onClick={() => confirm(`Delete project "${p.name}"? Tasks are kept.`) && start(() => deleteProject(p.id))}
              >
                <Trash2 />
              </Button>
            </li>
          ))}
          {!projects.length && <li className="text-sm text-muted-foreground">No projects yet.</li>}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Tags</h2>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!tag.trim()) return;
            const t = tag;
            setTag("");
            start(() => createTag(t));
          }}
        >
          <Input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="New tag" />
          <Button type="submit" disabled={pending}>
            Add
          </Button>
        </form>
        <ul className="flex flex-wrap gap-2">
          {tags.map((t) => (
            <li key={t.id} className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-sm">
              #{t.name}
              <button
                type="button"
                aria-label={`Delete tag ${t.name}`}
                onClick={() => confirm(`Delete tag "${t.name}"?`) && start(() => deleteTag(t.id))}
                className="text-muted-foreground hover:text-destructive"
              >
                ×
              </button>
            </li>
          ))}
          {!tags.length && <li className="text-sm text-muted-foreground">No tags yet.</li>}
        </ul>
      </section>
    </div>
  );
}
