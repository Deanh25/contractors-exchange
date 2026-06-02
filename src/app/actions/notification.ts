"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

/** Mark every unread notification read for the current user (bell + page). */
export async function markAllNotificationsReadAction(): Promise<void> {
  const user = await requireUser("/notifications");
  await prisma.notification.updateMany({
    where: { userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/notifications");
  revalidatePath("/", "layout");
}

/** Mark a single notification read (scoped to the owner). */
export async function markNotificationReadAction(id: string): Promise<void> {
  const user = await requireUser("/notifications");
  await prisma.notification.updateMany({
    where: { id, userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/notifications");
  revalidatePath("/", "layout");
}
