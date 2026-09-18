import { AppShell } from "@/components/app-shell";
import { TasksBoard, type ViewKey } from "@/components/tasks/tasks-board";
import { getAllTasks, getProjects, getTags } from "@/lib/queries";
import { getAccount, listEventsForDays, type CalendarEvent } from "@/lib/google";

export const dynamic = "force-dynamic";

const VIEWS: ViewKey[] = ["today", "list", "matrix", "ranked", "score"];

export default async function TasksPage({ searchParams }: PageProps<"/tasks">) {
  const sp = await searchParams;
  const raw = typeof sp.view === "string" ? sp.view : "today";
  const view: ViewKey = (VIEWS as string[]).includes(raw) ? (raw as ViewKey) : "today";
  const projectId = typeof sp.project === "string" ? Number(sp.project) || null : null;
  const tagId = typeof sp.tag === "string" ? Number(sp.tag) || null : null;

  const [tasks, projects, tags, events] = await Promise.all([
    getAllTasks(),
    getProjects(),
    getTags(),
    view === "today" ? loadTodayEvents() : Promise.resolve<CalendarEvent[] | null>(null),
  ]);

  return (
    <AppShell>
      <TasksBoard tasks={tasks} projects={projects} tags={tags} view={view} projectId={projectId} tagId={tagId} events={events} />
    </AppShell>
  );
}

/** Today's events from the connected Google account, or null when not connected / unavailable. */
async function loadTodayEvents(): Promise<CalendarEvent[] | null> {
  try {
    if (!(await getAccount())) return null;
    return await listEventsForDays(1);
  } catch (e) {
    console.error("calendar load failed", e);
    return null;
  }
}
