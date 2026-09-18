import Link from "next/link";
import { logout } from "@/actions/auth";
import { Button } from "@/components/ui/button";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-12 w-full max-w-4xl items-center justify-between px-4">
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/tasks?view=today" className="font-semibold">
              Tasks
            </Link>
            <Link href="/projects" className="text-muted-foreground hover:text-foreground">
              Projects & tags
            </Link>
          </nav>
          <form action={logout}>
            <Button variant="ghost" size="sm" type="submit">
              Sign out
            </Button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-4">{children}</main>
    </div>
  );
}
