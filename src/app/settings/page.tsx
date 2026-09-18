import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { disconnectGoogle, syncAllTasks } from "@/actions/google";
import { getAccount, googleConfigured } from "@/lib/google";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { isNotNull } from "drizzle-orm";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  not_configured:
    "Google OAuth isn't configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
  denied: "You cancelled the Google sign-in.",
  state: "Sign-in session expired or was tampered with. Try again.",
  exchange:
    "Google rejected the sign-in. Check the redirect URI in your Google Cloud OAuth client.",
};

export default async function SettingsPage({
  searchParams,
}: PageProps<"/settings">) {
  const sp = await searchParams;
  const error =
    typeof sp.error === "string"
      ? (ERRORS[sp.error] ?? "Something went wrong.")
      : null;
  const justConnected = sp.connected === "1";
  const account = await getAccount();
  const configured = googleConfigured();
  const [{ count }] = account
    ? await db
        .select({ count: tasks.id })
        .from(tasks)
        .where(isNotNull(tasks.googleEventId))
        .then((r) => [{ count: r.length }])
    : [{ count: 0 }];

  return (
    <AppShell>
      <div className="max-w-xl space-y-6">
        <h1 className="font-display text-[2.4rem] font-semibold leading-none tracking-tight sm:text-5xl">
          Settings
        </h1>

        <section className="space-y-3 border-t border-foreground/60 pt-4">
          <div>
            <h2 className="font-display text-xl font-medium">
              Google Calendar
            </h2>
            <p className="text-sm text-muted-foreground">
              Open tasks with a due date appear as all-day events on a
              &ldquo;Tasks&rdquo; calendar in your Google account. Today&rsquo;s
              events from your other calendars show up in the Today view.
            </p>
          </div>

          {error && <p className="text-sm text-overdue">{error}</p>}
          {justConnected && (
            <p className="text-sm">Connected. Your tasks are on the calendar now.</p>
          )}

          {account ? (
            <div className="space-y-3 text-sm">
              <p>
                Connected as{" "}
                <span className="font-medium">{account.email}</span> since{" "}
                {format(account.connectedAt, "MMM d, yyyy")}.
              </p>
              <p className="text-muted-foreground">
                {count} tasks currently on the calendar.
              </p>
              <div className="flex gap-2">
                <form action={syncAllTasks}>
                  <Button type="submit" variant="outline" size="sm">
                    Re-sync all tasks
                  </Button>
                </form>
                <form action={disconnectGoogle}>
                  <Button
                    type="submit"
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                  >
                    Disconnect
                  </Button>
                </form>
              </div>
            </div>
          ) : configured ? (
            <a
              href="/api/google/auth"
              className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/85"
            >
              Connect Google Calendar
            </a>
          ) : (
            <p className="text-sm text-muted-foreground">
              Not configured. Add{" "}
              <code className="rounded bg-muted px-1">GOOGLE_CLIENT_ID</code>{" "}
              and{" "}
              <code className="rounded bg-muted px-1">
                GOOGLE_CLIENT_SECRET
              </code>{" "}
              to the environment, then reload.
            </p>
          )}
        </section>
      </div>
    </AppShell>
  );
}
