import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <div className="w-full max-w-xs space-y-6">
        <div className="space-y-1">
          <h1 className="font-display text-4xl font-semibold tracking-tight">Next</h1>
          <p className="text-sm text-muted-foreground">Your password, then your day.</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
