"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { setSession, clearSession } from "@/lib/session";
import { writeActingCookie } from "@/lib/identity";

// Fresh sign-ins land on the Marketplace, acting as themselves, not on their
// personal profile page.
const DEFAULT_LANDING = "/listings";

function safeNext(next: FormDataEntryValue | null): string {
  const value = typeof next === "string" ? next : "";
  // Only allow local paths (avoid open redirects).
  return value.startsWith("/") && !value.startsWith("//")
    ? value
    : DEFAULT_LANDING;
}

/**
 * Passwordless dev sign-in (PRD §8 friction-killer). Find-or-create by email,
 * set the session cookie, and continue. New users must provide a name.
 */
export async function signInAction(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const next = safeNext(formData.get("next"));

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    redirect(`/signin?error=email&next=${encodeURIComponent(next)}`);
  }

  let user = await prisma.user.findUnique({ where: { email } });
  let isNew = false;
  if (!user) {
    if (!name) {
      redirect(
        `/signin?error=name&email=${encodeURIComponent(email)}&next=${encodeURIComponent(next)}`,
      );
    }
    user = await prisma.user.create({ data: { email, name } });
    isNew = true;
  }

  await setSession(user.id);
  // Always start signed-in sessions acting as the user (personal), never a stale
  // company identity left over from a previous session.
  await writeActingCookie(null);
  // Send brand-new accounts through onboarding (PRD §5) unless they were headed
  // somewhere specific (e.g. a "List something" link set next to a real path).
  redirect(isNew && next === DEFAULT_LANDING ? "/welcome" : next);
}

export async function signOutAction() {
  await clearSession();
  // Drop the acting-as identity too, so the next sign-in starts clean (personal).
  await writeActingCookie(null);
  redirect("/");
}
