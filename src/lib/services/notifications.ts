import "server-only";
import { prisma } from "@/lib/prisma";
import type { Actor } from "@/lib/services/actor";

/**
 * Notification read-state SERVICE. Framework-agnostic: no FormData/redirect/
 * revalidate/cookies. A company notification is shared, so marking it read clears
 * it for the whole team. The recipient scope (the user plus every company they may
 * act for) is exactly the Actor's actingCompanyIds. See docs/CX-build-checklist.md
 * section E. (Notification CREATION lives in src/lib/notifications.ts.)
 */

/** Notifications addressed to the actor OR a company they may act for. */
function recipientScope(actor: Actor) {
  const ids = [...actor.actingCompanyIds];
  return ids.length
    ? {
        OR: [
          { recipientUserId: actor.userId },
          { recipientCompanyId: { in: ids } },
        ],
      }
    : { recipientUserId: actor.userId };
}

/** Mark every unread notification read for the actor + their companies. */
export async function markAllRead(actor: Actor): Promise<void> {
  await prisma.notification.updateMany({
    where: { ...recipientScope(actor), readAt: null },
    data: { readAt: new Date() },
  });
}

/** Mark a single notification read (scoped to the actor's reach). */
export async function markOneRead(actor: Actor, id: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { id, ...recipientScope(actor), readAt: null },
    data: { readAt: new Date() },
  });
}
