"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { getActingCompanies } from "@/lib/identity";

/** Notifications addressed to the user OR a company they may act for. */
async function recipientScope(userId: string) {
  const companyIds = (await getActingCompanies(userId)).map((c) => c.id);
  return companyIds.length
    ? {
        OR: [
          { recipientUserId: userId },
          { recipientCompanyId: { in: companyIds } },
        ],
      }
    : { recipientUserId: userId };
}

/** Mark every unread notification read for the user + their companies. */
export async function markAllNotificationsReadAction(): Promise<void> {
  const user = await requireUser("/notifications");
  const scope = await recipientScope(user.id);
  await prisma.notification.updateMany({
    where: { ...scope, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/notifications");
  revalidatePath("/", "layout");
}

/** Mark a single notification read (scoped to the user's reach; for a company
 * notification this clears it for the whole team - shared read). */
export async function markNotificationReadAction(id: string): Promise<void> {
  const user = await requireUser("/notifications");
  const scope = await recipientScope(user.id);
  await prisma.notification.updateMany({
    where: { id, ...scope, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/notifications");
  revalidatePath("/", "layout");
}
