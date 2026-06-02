import "server-only";
import { prisma } from "@/lib/prisma";
import type { NotificationType } from "@/generated/prisma/client";

/**
 * Notifications (PRD §8). Fan-out helpers called from server actions on key
 * events. Recipients see them in the header bell dropdown and on /notifications;
 * readAt = null drives the unread badge.
 */

type NotifInput = {
  userId: string; // recipient
  type: NotificationType;
  title: string;
  href: string;
  actorId?: string | null;
  body?: string | null;
  threadId?: string | null;
  listingId?: string | null;
  transactionId?: string | null;
};

/** Create one notification. No-ops when the actor is the recipient (don't
 * notify people about their own actions). */
export async function createNotification(input: NotifInput): Promise<void> {
  if (input.actorId && input.actorId === input.userId) return;
  await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      href: input.href,
      actorId: input.actorId ?? null,
      body: input.body ?? null,
      threadId: input.threadId ?? null,
      listingId: input.listingId ?? null,
      transactionId: input.transactionId ?? null,
    },
  });
}

/** Unread count for the header bell badge. */
export async function getUnreadNotificationCount(
  userId: string,
): Promise<number> {
  return prisma.notification.count({ where: { userId, readAt: null } });
}

/** Recent notifications (with actor) for the bell dropdown / page. */
export async function getRecentNotifications(userId: string, take = 8) {
  return prisma.notification.findMany({
    where: { userId },
    include: { actor: true },
    orderBy: { createdAt: "desc" },
    take,
  });
}
