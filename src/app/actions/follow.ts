"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { resolveActor } from "@/lib/identity";
import { toggleFollow } from "@/lib/services/follows";

/**
 * Web transport shim over the follow SERVICE (src/lib/services/follows.ts).
 * Owns only web concerns: resolve the acting identity, the safe revalidate path,
 * and mapping the result. See docs/CX-build-checklist.md section E.
 */

/** Only allow revalidating same-origin paths we navigated from. */
function safePath(value: FormDataEntryValue | null): string {
  const v = typeof value === "string" ? value : "";
  return v.startsWith("/") && !v.startsWith("//") ? v : "/feed";
}

/** Toggle a follow on/off (as the acting party). Revalidates the source page. */
export async function toggleFollowAction(formData: FormData) {
  const actor = await resolveActor();
  const path = safePath(formData.get("path"));

  const result = await toggleFollow(actor, {
    targetType: String(formData.get("targetType") ?? ""),
    targetValue: String(formData.get("targetValue") ?? ""),
  });

  if (result.status === "ignored") redirect(path);
  revalidatePath(path);
}
