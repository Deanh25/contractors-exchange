"use server";

import { revalidatePath } from "next/cache";
import { resolveActor } from "@/lib/identity";
import { markAllRead, markOneRead } from "@/lib/services/notifications";

/**
 * Web transport shim over the notification SERVICE (src/lib/services/notifications.ts).
 * Owns only web concerns: resolve the acting identity and revalidate. The recipient
 * scope (user + their companies) is carried by the Actor. See
 * docs/CX-build-checklist.md section E.
 */

/** Mark every unread notification read for the user + their companies. */
export async function markAllNotificationsReadAction(): Promise<void> {
  const actor = await resolveActor("/notifications");
  await markAllRead(actor);
  revalidatePath("/notifications");
  revalidatePath("/", "layout");
}

/** Mark a single notification read (shared read for a company notification). */
export async function markNotificationReadAction(id: string): Promise<void> {
  const actor = await resolveActor("/notifications");
  await markOneRead(actor, id);
  revalidatePath("/notifications");
  revalidatePath("/", "layout");
}
