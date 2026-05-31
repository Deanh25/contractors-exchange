import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma, FollowTargetType } from "@/generated/prisma/client";

/**
 * Follows shape the unified feed (PRD §5). A user follows trades, locations (by
 * state code), companies, and people; the feed shows listings + posts matching
 * ANY followed target. With no follows, the feed falls back to everything so it's
 * never empty (onboarding seeds follows so it's relevant on first visit).
 */

export type FollowSets = {
  trades: string[];
  locations: string[];
  companies: string[];
  users: string[];
};

export async function getFollowSets(userId: string): Promise<FollowSets> {
  const rows = await prisma.follow.findMany({
    where: { followerUserId: userId },
  });
  const sets: FollowSets = { trades: [], locations: [], companies: [], users: [] };
  for (const r of rows) {
    if (r.targetType === "trade") sets.trades.push(r.targetValue);
    else if (r.targetType === "location") sets.locations.push(r.targetValue);
    else if (r.targetType === "company") sets.companies.push(r.targetValue);
    else if (r.targetType === "user") sets.users.push(r.targetValue);
  }
  return sets;
}

export function hasAnyFollows(s: FollowSets): boolean {
  return (
    s.trades.length + s.locations.length + s.companies.length + s.users.length > 0
  );
}

/** Listings matching any followed target. Empty object = match all. */
export function listingFollowFilter(s: FollowSets): Prisma.ListingWhereInput {
  const or: Prisma.ListingWhereInput[] = [];
  if (s.trades.length) or.push({ tradeCategory: { in: s.trades } });
  if (s.locations.length) or.push({ state: { in: s.locations } });
  if (s.companies.length) or.push({ ownerCompanyId: { in: s.companies } });
  if (s.users.length) or.push({ ownerUserId: { in: s.users } });
  return or.length ? { OR: or } : {};
}

/** Posts matching any followed target. Empty object = match all. */
export function postFollowFilter(s: FollowSets): Prisma.PostWhereInput {
  const or: Prisma.PostWhereInput[] = [];
  if (s.trades.length) or.push({ tradeTag: { in: s.trades } });
  if (s.locations.length) or.push({ regionTag: { in: s.locations } });
  if (s.companies.length) or.push({ authorCompanyId: { in: s.companies } });
  if (s.users.length) or.push({ authorUserId: { in: s.users } });
  return or.length ? { OR: or } : {};
}

/** Is `userId` following a specific target? Used to label follow buttons. */
export async function isFollowing(
  userId: string,
  targetType: FollowTargetType,
  targetValue: string,
): Promise<boolean> {
  const row = await prisma.follow.findUnique({
    where: {
      followerUserId_targetType_targetValue: {
        followerUserId: userId,
        targetType,
        targetValue,
      },
    },
  });
  return !!row;
}
