import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Can `userId` manage this listing? True if they own it as an individual, or are
 * an owner of the company that owns it (PRD §2 permissions). Shared by the detail
 * page, edit page, and the management actions.
 */
export async function canManageListing(
  userId: string,
  listing: { ownerUserId: string | null; ownerCompanyId: string | null },
): Promise<boolean> {
  if (listing.ownerUserId === userId) return true;
  if (listing.ownerCompanyId) {
    const m = await prisma.membership.findUnique({
      where: {
        userId_companyId: { userId, companyId: listing.ownerCompanyId },
      },
    });
    return m?.role === "owner";
  }
  return false;
}
