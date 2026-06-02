import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Messaging helpers (PRD §6). Threads are 1:1 between two users; company-owned
 * listings and company pages are messaged via the company's primary owner.
 */

/** Canonical participant order so (A,B) and (B,A) resolve to one thread. */
export function canonicalPair(id1: string, id2: string) {
  return id1 < id2
    ? { userAId: id1, userBId: id2 }
    : { userAId: id2, userBId: id1 };
}

/** Pick the participant who isn't the viewer (for headers / inbox rows). */
export function otherParticipant<T extends { id: string }>(
  viewerId: string,
  userA: T,
  userB: T,
): T {
  return userA.id === viewerId ? userB : userA;
}

/** Find (or create) the 1:1 thread between two users for an optional listing. */
export async function findOrCreateThread(
  viewerId: string,
  otherUserId: string,
  listingId: string | null = null,
) {
  const { userAId, userBId } = canonicalPair(viewerId, otherUserId);
  const existing = await prisma.thread.findFirst({
    where: { userAId, userBId, listingId },
  });
  if (existing) return existing;
  return prisma.thread.create({ data: { userAId, userBId, listingId } });
}

/** A company's primary (earliest) owner user id, or null. */
export async function resolveCompanyOwner(
  companyId: string,
): Promise<string | null> {
  const owner = await prisma.membership.findFirst({
    where: { companyId, role: "owner" },
    orderBy: { createdAt: "asc" },
  });
  return owner?.userId ?? null;
}

/** Who receives a message about a listing: the seller, or a company's owner. */
export async function resolveListingRecipient(listing: {
  ownerUserId: string | null;
  ownerCompanyId: string | null;
}): Promise<string | null> {
  if (listing.ownerUserId) return listing.ownerUserId;
  if (listing.ownerCompanyId) return resolveCompanyOwner(listing.ownerCompanyId);
  return null;
}

type ReadFields = {
  userAId: string;
  userBId: string;
  userALastReadAt: Date | null;
  userBLastReadAt: Date | null;
};

/** Is the latest message unread for this viewer? (Latest is from the other party
 * and newer than the viewer's last-read time.) */
export function threadIsUnread(
  viewerId: string,
  thread: ReadFields,
  lastMessage: { senderId: string; createdAt: Date } | null | undefined,
): boolean {
  if (!lastMessage || lastMessage.senderId === viewerId) return false;
  const lastRead =
    thread.userAId === viewerId ? thread.userALastReadAt : thread.userBLastReadAt;
  return !lastRead || lastMessage.createdAt > lastRead;
}

/** Count of the viewer's threads with an unread latest message (for badges). */
export async function getUnreadCount(userId: string): Promise<number> {
  const threads = await prisma.thread.findMany({
    where: { OR: [{ userAId: userId }, { userBId: userId }] },
    select: {
      userAId: true,
      userBId: true,
      userALastReadAt: true,
      userBLastReadAt: true,
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { senderId: true, createdAt: true },
      },
    },
  });
  return threads.reduce(
    (n, t) => n + (threadIsUnread(userId, t, t.messages[0]) ? 1 : 0),
    0,
  );
}
