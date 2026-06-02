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
 * Landing: switching to an identity while on a workspace page that belongs to
 * the OTHER identity would otherwise leave a stale view, so we move to the new
 * identity's home. Personal pages (/me, /saved) are pinned to the user; the
 * company workspace lives at /company/[slug]. On neutral/shared pages (feed,
 * inbox, orders, ...) we stay put and the page just re-scopes.
 */
export async function setActingContextAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const value = String(formData.get("value") ?? "self");
  const path = safePath(formData.get("path"), "/");

  const onPersonalWorkspace =
    path === "/me" ||
    path.startsWith("/me/") ||
    path === "/saved" ||
    path.startsWith("/saved/");
  const onCompanyWorkspace = path.startsWith("/company/");

  let dest = path;
  if (value === "self") {
    await writeActingCookie(null);
    // Leaving a company workspace page -> your personal profile.
    if (onCompanyWorkspace) dest = "/me";
  } else if (await canActAs(user.id, value)) {
    await writeActingCookie(value);
    // Entering a company while on a personal or company workspace page ->
    // that company's workspace home.
    if (onPersonalWorkspace || onCompanyWorkspace) {
      const co = await prisma.company.findUnique({
        where: { id: value },
        select: { slug: true },
      });
      dest = co ? `/company/${co.slug}` : path;
    }
  }

  revalidatePath("/", "layout");
  redirect(dest);
}
