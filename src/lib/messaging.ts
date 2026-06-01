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
