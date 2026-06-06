import "server-only";
import { prisma } from "@/lib/prisma";
import type { Party } from "@/lib/messaging";
import type { Prisma, FollowTargetType } from "@/generated/prisma/client";

/**
 * Follow READERS (PRD §4 + §5). Two concerns share the Follow table:
 *  - Topic follows (trade/location) shape the personal feed (getFollowSets).
 *  - People/company follows form the social graph (counts + lists below), which
 *    is party-aware: a follower can be a user OR a company (acting-as).
 * Mutations live in src/lib/services/follows.ts.
 */

const SOCIAL: FollowTargetType[] = ["user", "company"];

export type FollowSets = {
  trades: string[];
  locations: string[];
  companies: string[];
  users: string[];
};

/** A user's PERSONAL follows (not the company-acted ones) for their feed. */
export async function getFollowSets(userId: string): Promise<FollowSets> {
  const rows = await prisma.follow.findMany({
    where: { followerUserId: userId, followerCompanyId: null },
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

// --- Social graph (people + companies) --------------------------------------

/** Where-fragment for "everything this party follows" (people + companies). */
function followingWhere(party: Party): Prisma.FollowWhereInput {
  const base = { targetType: { in: SOCIAL } };
  return party.type === "company"
    ? { ...base, followerCompanyId: party.id }
    : { ...base, followerUserId: party.id, followerCompanyId: null };
}

/** Is `follower` following `target`? Party-aware (labels follow buttons). */
export async function isFollowing(
  follower: Party,
  target: Party,
): Promise<boolean> {
  const where: Prisma.FollowWhereInput =
    follower.type === "company"
      ? {
          followerCompanyId: follower.id,
          targetType: target.type,
          targetValue: target.id,
        }
      : {
          followerUserId: follower.id,
          followerCompanyId: null,
          targetType: target.type,
          targetValue: target.id,
        };
  return (await prisma.follow.count({ where })) > 0;
}

/** Follower + following counts for a party (the social graph). */
export async function getFollowCounts(
  party: Party,
): Promise<{ followers: number; following: number }> {
  const [followers, following] = await Promise.all([
    prisma.follow.count({
      where: { targetType: party.type, targetValue: party.id },
    }),
    prisma.follow.count({ where: followingWhere(party) }),
  ]);
  return { followers, following };
}

export type FollowParty = {
  type: "user" | "company";
  id: string;
  name: string;
  avatar: string | null;
  href: string;
  headline: string | null;
};
export type FollowEntry = FollowParty & { isViewerFollowing: boolean };

/** Resolve a batch of parties to display info (name/avatar/href/headline). */
async function resolveParties(
  parties: Party[],
): Promise<Map<string, FollowParty>> {
  const userIds = [
    ...new Set(parties.filter((p) => p.type === "user").map((p) => p.id)),
  ];
  const companyIds = [
    ...new Set(parties.filter((p) => p.type === "company").map((p) => p.id)),
  ];
  const [users, companies] = await Promise.all([
    userIds.length
      ? prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, avatarUrl: true, title: true },
        })
      : [],
    companyIds.length
      ? prisma.company.findMany({
          where: { id: { in: companyIds } },
          select: { id: true, name: true, slug: true, logoUrl: true, description: true },
        })
      : [],
  ]);
  const map = new Map<string, FollowParty>();
  for (const u of users) {
    map.set(`user:${u.id}`, {
      type: "user",
      id: u.id,
      name: u.name,
      avatar: u.avatarUrl,
      href: `/u/${u.id}`,
      headline: u.title ?? null,
    });
  }
  for (const c of companies) {
    map.set(`company:${c.id}`, {
      type: "company",
      id: c.id,
      name: c.name,
      avatar: c.logoUrl,
      href: `/company/${c.slug}`,
      headline: c.description ?? null,
    });
  }
  return map;
}

/** Resolve one party's display info (name/avatar/href/headline), or null. */
export async function resolvePartyDisplay(
  party: Party,
): Promise<FollowParty | null> {
  return (await resolveParties([party])).get(`${party.type}:${party.id}`) ?? null;
}

/** Decorate a party list with display info + whether the viewer follows each. */
async function decorate(
  parties: Party[],
  viewer: Party | null,
): Promise<FollowEntry[]> {
  const display = await resolveParties(parties);
  let viewerFollows = new Set<string>();
  if (viewer) {
    const rows = await prisma.follow.findMany({
      where: followingWhere(viewer),
      select: { targetType: true, targetValue: true },
    });
    viewerFollows = new Set(rows.map((r) => `${r.targetType}:${r.targetValue}`));
  }
  const out: FollowEntry[] = [];
  for (const p of parties) {
    const key = `${p.type}:${p.id}`;
    const d = display.get(key);
    if (!d) continue; // a deleted user/company: skip
    out.push({ ...d, isViewerFollowing: viewerFollows.has(key) });
  }
  return out;
}

/** Parties who follow `party`, newest first, labeled for the viewer. */
export async function listFollowers(
  party: Party,
  viewer: Party | null,
): Promise<FollowEntry[]> {
  const rows = await prisma.follow.findMany({
    where: { targetType: party.type, targetValue: party.id },
    orderBy: { createdAt: "desc" },
  });
  const parties: Party[] = rows.map((r) =>
    r.followerCompanyId
      ? { type: "company", id: r.followerCompanyId }
      : { type: "user", id: r.followerUserId },
  );
  return decorate(parties, viewer);
}

/** People + companies `party` follows, newest first, labeled for the viewer. */
export async function listFollowing(
  party: Party,
  viewer: Party | null,
): Promise<FollowEntry[]> {
  const rows = await prisma.follow.findMany({
    where: followingWhere(party),
    orderBy: { createdAt: "desc" },
  });
  const parties: Party[] = rows.map((r) => ({
    type: r.targetType as "user" | "company",
    id: r.targetValue,
  }));
  return decorate(parties, viewer);
}
