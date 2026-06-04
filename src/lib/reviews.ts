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

type SellerParty = { type: "user" | "company"; id: string };

/**
 * A seller's OVERALL rating (avg + count across all their completed sales),
 * batched for a set of sellers (used on marketplace cards). Returns a map keyed
 * by "<type>:<id>"; absent key = no reviews yet (caller shows an empty state).
 * Derived only from real Review rows - never invented.
 */
export async function getSellerRatings(
  parties: SellerParty[],
): Promise<Map<string, Rating>> {
  const userIds = [
    ...new Set(parties.filter((p) => p.type === "user").map((p) => p.id)),
  ];
  const companyIds = [
    ...new Set(parties.filter((p) => p.type === "company").map((p) => p.id)),
  ];
  const map = new Map<string, Rating>();

  const [userRows, companyRows] = await Promise.all([
    userIds.length
      ? prisma.review.groupBy({
          by: ["rateeUserId"],
          where: { rateeUserId: { in: userIds } },
          _avg: { stars: true },
          _count: true,
        })
      : Promise.resolve([]),
    companyIds.length
      ? prisma.review.groupBy({
          by: ["rateeCompanyId"],
          where: { rateeCompanyId: { in: companyIds } },
          _avg: { stars: true },
          _count: true,
        })
      : Promise.resolve([]),
  ]);

  for (const r of userRows) {
    if (r.rateeUserId)
      map.set(`user:${r.rateeUserId}`, {
        avg: r._avg.stars ?? 0,
        count: r._count,
      });
  }
  for (const r of companyRows) {
    if (r.rateeCompanyId)
      map.set(`company:${r.rateeCompanyId}`, {
        avg: r._avg.stars ?? 0,
        count: r._count,
      });
  }
  return map;
}
