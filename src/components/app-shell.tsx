import Link from "next/link";
import { logout } from "@/actions/auth";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <header>
        <div className="mx-auto flex h-14 w-full max-w-2xl items-baseline justify-between px-4">
          <Link
            href="/tasks?view=today"
            className="font-display text-xl font-semibold tracking-tight"
          >
            Next
          </Link>
          <nav className="flex items-baseline gap-5 text-sm text-muted-foreground">
            <Link href="/projects" className="hover:text-foreground">
              Projects & tags
            </Link>
            <Link href="/settings" className="hover:text-foreground">
              Settings
            </Link>
            <form action={logout}>
              <button type="submit" className="hover:text-foreground">
                Sign out
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-16 pt-2">
        {children}
      </main>
    </div>
  );
}
