import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Reputation aggregates (PRD §7). Reviews are user-to-user, accrued from
 * completed deals. A company's rating spans the reviews received by its members.
 */

export type Rating = { avg: number; count: number };

export async function getUserRating(userId: string): Promise<Rating> {
  const r = await prisma.review.aggregate({
    where: { rateeId: userId },
    _avg: { stars: true },
    _count: true,
  });
  return { avg: r._avg.stars ?? 0, count: r._count };
}

async function companyMemberIds(companyId: string): Promise<string[]> {
  const members = await prisma.membership.findMany({
    where: { companyId },
    select: { userId: true },
  });
  return members.map((m) => m.userId);
}

export async function getCompanyRating(companyId: string): Promise<Rating> {
  const ids = await companyMemberIds(companyId);
  if (ids.length === 0) return { avg: 0, count: 0 };
  const r = await prisma.review.aggregate({
    where: { rateeId: { in: ids } },
    _avg: { stars: true },
    _count: true,
  });
  return { avg: r._avg.stars ?? 0, count: r._count };
}

/** Include the reviewer and the deal's listing (the product being reviewed). */
const reviewInclude = {
  rater: true,
  transaction: { select: { listing: { select: { id: true, title: true } } } },
} as const;

export async function getUserReviews(userId: string, take = 10) {
  return prisma.review.findMany({
    where: { rateeId: userId },
    include: reviewInclude,
    orderBy: { createdAt: "desc" },
    take,
  });
}

export async function getCompanyReviews(companyId: string, take = 10) {
  const ids = await companyMemberIds(companyId);
  if (ids.length === 0) return [];
  return prisma.review.findMany({
    where: { rateeId: { in: ids } },
    include: reviewInclude,
    orderBy: { createdAt: "desc" },
    take,
  });
}
