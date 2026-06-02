import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Reputation aggregates (PRD §7 + company-as-actor). Reviews target a PARTY: a
 * user (personal) or a company. A company's rating comes from reviews ABOUT the
 * company (its own deals), kept separate from its members' personal reviews.
 */

export type Rating = { avg: number; count: number };

/** Include the reviewer (and the identity they acted as) + the deal's listing. */
const reviewInclude = {
  raterUser: true,
  raterCompany: true,
  transaction: { select: { listing: { select: { id: true, title: true } } } },
} as const;

export async function getUserRating(userId: string): Promise<Rating> {
  const r = await prisma.review.aggregate({
    where: { rateeUserId: userId },
    _avg: { stars: true },
    _count: true,
  });
  return { avg: r._avg.stars ?? 0, count: r._count };
}

export async function getCompanyRating(companyId: string): Promise<Rating> {
  const r = await prisma.review.aggregate({
    where: { rateeCompanyId: companyId },
    _avg: { stars: true },
    _count: true,
  });
  return { avg: r._avg.stars ?? 0, count: r._count };
}

export async function getUserReviews(userId: string, take = 10) {
  return prisma.review.findMany({
    where: { rateeUserId: userId },
    include: reviewInclude,
    orderBy: { createdAt: "desc" },
    take,
  });
}

export async function getCompanyReviews(companyId: string, take = 10) {
  return prisma.review.findMany({
    where: { rateeCompanyId: companyId },
    include: reviewInclude,
    orderBy: { createdAt: "desc" },
    take,
  });
}
