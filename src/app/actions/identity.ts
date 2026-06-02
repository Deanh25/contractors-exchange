"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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
 */
export async function setActingContextAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const value = String(formData.get("value") ?? "self");
  const path = safePath(formData.get("path"), "/");

  if (value === "self") {
    await writeActingCookie(null);
  } else if (await canActAs(user.id, value)) {
    await writeActingCookie(value);
  }
  revalidatePath("/", "layout");
  redirect(path);
}
