import { AppShell } from "@/components/app-shell";
import { ProjectsManager } from "@/components/projects/projects-manager";
import { getProjects, getTags } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const [projects, tags] = await Promise.all([getProjects(), getTags()]);
  return (
    <AppShell>
      <ProjectsManager projects={projects} tags={tags} />
    </AppShell>
  );
}
