import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Saved listings (PRD §8). Helpers for the bookmark toggle and the /saved page.
 */

/** Set of listing ids the viewer has saved (for setting card button state). */
export async function getSavedListingIds(
  userId: string | null | undefined,
): Promise<Set<string>> {
  if (!userId) return new Set();
  const rows = await prisma.savedListing.findMany({
    where: { userId },
    select: { listingId: true },
  });
  return new Set(rows.map((r) => r.listingId));
}

/** Count of the viewer's saved listings (for the workspace shell badge). */
export async function getSavedCount(userId: string): Promise<number> {
  return prisma.savedListing.count({ where: { userId } });
}

/** Map of listingId -> collectionId (null = uncategorized) for the viewer's
 * saves. Lets cards show both the saved state and which collection it is in. */
export async function getSavedMap(
  userId: string | null | undefined,
): Promise<Map<string, string | null>> {
  if (!userId) return new Map();
  const rows = await prisma.savedListing.findMany({
    where: { userId },
    select: { listingId: true, collectionId: true },
  });
  return new Map(rows.map((r) => [r.listingId, r.collectionId]));
}

/** The viewer's collections (for the save-to-collection menu). */
export async function getViewerCollections(
  userId: string | null | undefined,
): Promise<{ id: string; name: string }[]> {
  if (!userId) return [];
  return prisma.collection.findMany({
    where: { userId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}
