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
