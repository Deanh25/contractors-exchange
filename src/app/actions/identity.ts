"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { canActAs, writeActingCookie } from "@/lib/identity";

/** Only allow redirecting back to a same-origin path. */
function safePath(value: FormDataEntryValue | null, fallback = "/"): string {
  const v = typeof value === "string" ? value : "";
  return v.startsWith("/") && !v.startsWith("//") ? v : fallback;
}

/**
 * Switch the current acting identity: "self" to act as the user, or a company
 * id the user may act for. Re-validated server-side before the cookie is set.
 *
 * Landing: switching TO a company always jumps to that company's workspace
 * (/company/[slug]) so the switch is always visible - relying on the current
 * path could silently leave you on your personal page. Switching back to SELF
 * leaves a company workspace for /me, but stays put on neutral/shared pages
 * (feed, inbox, orders, ...) which just re-scope to you.
 */
export async function setActingContextAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const value = String(formData.get("value") ?? "self");
  const path = safePath(formData.get("path"), "/");

  const onCompanyWorkspace = path.startsWith("/company/");

  let dest = path;
  if (value === "self") {
    await writeActingCookie(null);
    // Leaving a company workspace page -> your personal profile.
    if (onCompanyWorkspace) dest = "/me";
  } else if (await canActAs(user.id, value)) {
    await writeActingCookie(value);
    // Switching INTO a company always lands on that company's workspace. The
    // destination must not depend on the client-provided `path` (which can be
    // stale/empty and would silently leave you on your personal page); the whole
    // point of the switch is to see the company you just selected.
    const co = await prisma.company.findUnique({
      where: { id: value },
      select: { slug: true },
    });
    dest = co ? `/company/${co.slug}` : path;
  }

  revalidatePath("/", "layout");
  redirect(dest);
}
