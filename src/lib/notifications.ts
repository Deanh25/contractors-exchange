import "server-only";
import { prisma } from "@/lib/prisma";
import { getActingCompanies } from "@/lib/identity";
import type { Party } from "@/lib/messaging";
import type { NotificationType } from "@/generated/prisma/client";

/**
 * Notifications (PRD §8 + company-as-actor). One record per event, addressed to
 * a PARTY: a user, or a company (whose permitted team all see the single record,
 * labeled with the company; shared read). The actor records the human + the
 * identity they acted as.
 */

type NotifInput = {
  recipient: Party;
  type: NotificationType;
  title: string;
  href: string;
  actorUserId?: string | null;
  actorCompanyId?: string | null;
  body?: string | null;
  threadId?: string | null;
  listingId?: string | null;
  transactionId?: string | null;
};

/** Create one notification. No-ops when a user would be notified of their own
 * action. */
export async function createNotification(input: NotifInput): Promise<void> {
  if (
    input.recipient.type === "user" &&
    input.actorUserId &&
    input.recipient.id === input.actorUserId
  ) {
    return;
  }
  await prisma.notification.create({
    data: {
      recipientUserId: input.recipient.type === "user" ? input.recipient.id : null,
      recipientCompanyId:
        input.recipient.type === "company" ? input.recipient.id : null,
      type: input.type,
      title: input.title,
      href: input.href,
      actorUserId: input.actorUserId ?? null,
      actorCompanyId: input.actorCompanyId ?? null,
      body: input.body ?? null,
      threadId: input.threadId ?? null,
      listingId: input.listingId ?? null,
      transactionId: input.transactionId ?? null,
    },
  });
}

/** Where-fragment: notifications addressed to this user OR a company they act
 * for (so the bell aggregates personal + company activity, labeled). */
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

/** Unread count across the user's personal + actable-company notifications. */
export async function getUnreadNotificationCount(
  userId: string,
): Promise<number> {
  const scope = await recipientScope(userId);
  return prisma.notification.count({ where: { ...scope, readAt: null } });
}

/** Recent notifications (with actor + recipient-company label) for the bell/page. */
export async function getRecentNotifications(userId: string, take = 8) {
  const scope = await recipientScope(userId);
  return prisma.notification.findMany({
    where: scope,
    include: { actorUser: true, actorCompany: true, recipientCompany: true },
    orderBy: { createdAt: "desc" },
    take,
  });
}
