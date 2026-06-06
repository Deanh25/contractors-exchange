"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { toggleFollow } from "@/lib/services/follows";

/**
 * Web transport shim over the follow SERVICE (src/lib/services/follows.ts).
 * Owns only web concerns: auth, the safe revalidate path, and mapping the result.
 * See docs/CX-build-checklist.md section E.
 */

/** Only allow revalidating same-origin paths we navigated from. */
function safePath(value: FormDataEntryValue | null): string {
  const v = typeof value === "string" ? value : "";
  return v.startsWith("/") && !v.startsWith("//") ? v : "/feed";
}

/** Toggle a follow on/off. Revalidates the page it was clicked from. */
export async function toggleFollowAction(formData: FormData) {
  const user = await requireUser();
  const path = safePath(formData.get("path"));

  const result = await toggleFollow(
    { id: user.id, name: user.name },
    {
      targetType: String(formData.get("targetType") ?? ""),
      targetValue: String(formData.get("targetValue") ?? ""),
    },
  );

  if (result.status === "ignored") redirect(path);
  revalidatePath(path);
}
