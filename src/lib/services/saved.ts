import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Saved-listings + collections SERVICE (PRD §4). Framework-agnostic: no FormData/
 * redirect/revalidate/cookies. All operations are user-scoped. Callers validate
 * input presence + revalidate; the service owns the DB mutations. Listing/
 * collection existence is verified here so the rules hold for any caller. See
 * docs/CX-build-checklist.md section E.
 */

/** Resolve a raw collection id to one owned by the user, or null (uncategorized). */
async function ownedCollectionId(
  userId: string,
  raw: string,
): Promise<string | null> {
  if (!raw) return null;
  const col = await prisma.collection.findFirst({
    where: { id: raw, userId },
    select: { id: true },
  });
  return col?.id ?? null;
}

async function listingExists(listingId: string): Promise<boolean> {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { id: true },
  });
  return !!listing;
}

/** Toggle a listing's saved state for the user, driven by current DB state. */
export async function toggleSave(userId: string, listingId: string): Promise<void> {
  const existing = await prisma.savedListing.findUnique({
    where: { userId_listingId: { userId, listingId } },
  });
  if (existing) {
    await prisma.savedListing.delete({ where: { id: existing.id } });
  } else if (await listingExists(listingId)) {
    await prisma.savedListing.create({ data: { userId, listingId } });
  }
}

/** Save a listing into a collection (empty = uncategorized). Upserts. */
export async function saveToCollection(
  userId: string,
  listingId: string,
  collectionRaw: string,
): Promise<void> {
  const collectionId = await ownedCollectionId(userId, collectionRaw);
  if (await listingExists(listingId)) {
    await prisma.savedListing.upsert({
      where: { userId_listingId: { userId, listingId } },
      create: { userId, listingId, collectionId },
      update: { collectionId },
    });
  }
}

/** Create a collection on the fly and save a listing straight into it. */
export async function createCollectionAndSave(
  userId: string,
  listingId: string,
  name: string,
): Promise<void> {
  const col = await prisma.collection.upsert({
    where: { userId_name: { userId, name } },
    create: { userId, name },
    update: {},
  });
  if (await listingExists(listingId)) {
    await prisma.savedListing.upsert({
      where: { userId_listingId: { userId, listingId } },
      create: { userId, listingId, collectionId: col.id },
      update: { collectionId: col.id },
    });
  }
}

/** Remove a listing from the user's saved set entirely. */
export async function removeSave(userId: string, listingId: string): Promise<void> {
  await prisma.savedListing.deleteMany({ where: { userId, listingId } });
}

/** Create a new collection (folder); names are unique per user (reused if exists). */
export async function createCollection(userId: string, name: string): Promise<void> {
  await prisma.collection.upsert({
    where: { userId_name: { userId, name } },
    create: { userId, name },
    update: {},
  });
}

/** Move a saved listing into a collection (empty = uncategorized). */
export async function setSaveCollection(
  userId: string,
  listingId: string,
  collectionRaw: string,
): Promise<void> {
  const collectionId = await ownedCollectionId(userId, collectionRaw);
  await prisma.savedListing.updateMany({
    where: { userId, listingId },
    data: { collectionId },
  });
}

/** Delete a collection; its saved listings fall back to uncategorized. */
export async function deleteCollection(
  userId: string,
  collectionId: string,
): Promise<void> {
  await prisma.collection.deleteMany({ where: { id: collectionId, userId } });
}
