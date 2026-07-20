"use server";

import { redirect } from "next/navigation";
import { setSession, clearSession } from "@/lib/session";
import { writeActingCookie } from "@/lib/identity";
import { signInWithPassword, signUpWithPassword } from "@/lib/services/auth";

/**
 * Auth transport shim over the auth SERVICE (src/lib/services/auth.ts). Owns web
 * concerns only: parse the form, set the session cookie, and map results to
 * redirects. Email + password (Phase 1). OAuth (Google/Microsoft) lands later.
 */

// Fresh sign-ins land on the Marketplace, acting as themselves.
const DEFAULT_LANDING = "/listings";

function safeNext(next: FormDataEntryValue | null): string {
  const value = typeof next === "string" ? next : "";
  // Only allow local paths (avoid open redirects).
  return value.startsWith("/") && !value.startsWith("//")
    ? value
    : DEFAULT_LANDING;
}

/** Start a signed-in session acting as the user (never a stale company). */
async function startSession(userId: string): Promise<void> {
  await setSession(userId);
  await writeActingCookie(null);
}

/** Sign in with email + password. */
export async function signInAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));
  const back = (code: string) =>
    redirect(
      `/signin?error=${code}&email=${encodeURIComponent(email.trim())}&next=${encodeURIComponent(next)}`,
    );

  const result = await signInWithPassword(email, password);
  if (result.status === "invalid_credentials") back("credentials");
  if (result.status === "suspended") back("suspended");

  if (result.status === "ok") {
    await startSession(result.userId);
    redirect(next);
  }
}

/** Create an account with email + password + name, then sign in. */
export async function signUpAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("name") ?? "");
  const next = safeNext(formData.get("next"));
  const back = (code: string) =>
    redirect(
      `/signin?mode=signup&error=${code}&email=${encodeURIComponent(email.trim())}&name=${encodeURIComponent(name.trim())}&next=${encodeURIComponent(next)}`,
    );

  const result = await signUpWithPassword({ email, password, name });
  if (result.status === "invalid_email") back("email");
  if (result.status === "missing_name") back("name");
  if (result.status === "weak_password") back("weak");
  if (result.status === "email_taken") back("taken");

  if (result.status === "ok") {
    await startSession(result.userId);
    // New accounts go through onboarding unless headed somewhere specific.
    redirect(next === DEFAULT_LANDING ? "/welcome" : next);
  }
}

export async function signOutAction() {
  await clearSession();
  // Drop the acting-as identity too, so the next sign-in starts clean (personal).
  await writeActingCookie(null);
  redirect("/");
}
