"use server";

import { redirect } from "next/navigation";
import { clearSessionCookie, passwordMatches, setSessionCookie } from "@/lib/auth";

export async function login(_prev: { error?: string } | undefined, formData: FormData) {
  const password = String(formData.get("password") ?? "");
  if (!passwordMatches(password)) return { error: "Wrong password" };
  await setSessionCookie();
  redirect("/tasks?view=today");
}

export async function logout() {
  await clearSessionCookie();
  redirect("/login");
}
