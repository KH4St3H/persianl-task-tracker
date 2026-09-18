import { AppShell } from "@/components/app-shell";
import { TasksBoard, type ViewKey } from "@/components/tasks/tasks-board";
import { getAllTasks, getProjects, getTags } from "@/lib/queries";

export const dynamic = "force-dynamic";

const VIEWS: ViewKey[] = ["today", "list", "matrix", "ranked", "score"];

export default async function TasksPage({ searchParams }: PageProps<"/tasks">) {
  const sp = await searchParams;
  const raw = typeof sp.view === "string" ? sp.view : "today";
  const view: ViewKey = (VIEWS as string[]).includes(raw) ? (raw as ViewKey) : "today";
  const projectId = typeof sp.project === "string" ? Number(sp.project) || null : null;
  const tagId = typeof sp.tag === "string" ? Number(sp.tag) || null : null;

  const [tasks, projects, tags] = await Promise.all([getAllTasks(), getProjects(), getTags()]);

  return (
    <AppShell>
      <TasksBoard tasks={tasks} projects={projects} tags={tags} view={view} projectId={projectId} tagId={tagId} />
    </AppShell>
  );
}
