import "server-only";
import { prisma } from "@/lib/prisma";
import type { Party } from "@/lib/messaging";
import type { ReactionType } from "@/generated/prisma/client";

/**
 * Post engagement (PRD §4, LinkedIn-style): reactions + comments, both attributed
 * to a PARTY (a user, or a company via acting-as). Reads are batched/cached for
 * the feed; one reaction per party per post (type can change). Reaction icons +
 * labels live in the client-safe @/lib/reactions module.
 */

export { REACTIONS, REACTION_META } from "@/lib/reactions";

export type PostEngagement = {
  total: number;
  byType: Partial<Record<ReactionType, number>>;
  viewerReaction: ReactionType | null;
  commentCount: number;
};

/** Does a reaction row belong to the viewer's acting party? */
function isViewerReaction(
  r: { userId: string; companyId: string | null },
  viewer: Party,
): boolean {
  return viewer.type === "company"
    ? r.companyId === viewer.id
    : r.userId === viewer.id && r.companyId === null;
}

/** Engagement summary for a set of posts (batched), from the viewer's POV. */
export async function getPostEngagement(
  postIds: string[],
  viewer: Party | null,
): Promise<Map<string, PostEngagement>> {
  const out = new Map<string, PostEngagement>();
  if (postIds.length === 0) return out;
  for (const id of postIds) {
    out.set(id, { total: 0, byType: {}, viewerReaction: null, commentCount: 0 });
  }

  const [reactions, commentGroups] = await Promise.all([
    prisma.reaction.findMany({
      where: { postId: { in: postIds } },
      select: { postId: true, type: true, userId: true, companyId: true },
    }),
    prisma.comment.groupBy({
      by: ["postId"],
      where: { postId: { in: postIds } },
      _count: { _all: true },
    }),
  ]);

  for (const r of reactions) {
    const e = out.get(r.postId);
    if (!e) continue;
    e.total += 1;
    e.byType[r.type] = (e.byType[r.type] ?? 0) + 1;
    if (viewer && isViewerReaction(r, viewer)) e.viewerReaction = r.type;
  }
  for (const g of commentGroups) {
    const e = out.get(g.postId);
    if (e) e.commentCount = g._count._all;
  }
  return out;
}

/** How a party (user, or company acting-as) shows up in engagement UIs. */
export type PartyDisplay = {
  name: string;
  avatar: string | null;
  href: string;
  kind: "user" | "company";
};
export type CommentAuthor = PartyDisplay;

export type CommentNode = {
  id: string;
  body: string;
  createdAt: Date;
  author: CommentAuthor;
  replies: CommentNode[];
};

/** Map an engagement row's user/company to the acting party's display info. */
function partyDisplay(c: {
  user: { id: string; name: string; avatarUrl: string | null };
  company: { name: string; slug: string; logoUrl: string | null } | null;
}): PartyDisplay {
  if (c.company) {
    return {
      name: c.company.name,
      avatar: c.company.logoUrl,
      href: `/company/${c.company.slug}`,
      kind: "company",
    };
  }
  return {
    name: c.user.name,
    avatar: c.user.avatarUrl,
    href: `/u/${c.user.id}`,
    kind: "user",
  };
}

export type Reactor = {
  type: ReactionType;
  party: PartyDisplay;
  isViewer: boolean;
};

export type PostReactors = {
  total: number;
  byType: Partial<Record<ReactionType, number>>;
  viewerReaction: ReactionType | null;
  reactors: Reactor[];
};

/**
 * Full reactor list for one post (the "who reacted" modal). Lazy: called only
 * when a viewer opens the modal, never during the feed render. The viewer's own
 * reaction sorts first, LinkedIn-style.
 */
export async function getPostReactors(
  postId: string,
  viewer: Party | null,
): Promise<PostReactors> {
  const rows = await prisma.reaction.findMany({
    where: { postId },
    include: {
      user: { select: { id: true, name: true, avatarUrl: true } },
      company: { select: { name: true, slug: true, logoUrl: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  const byType: Partial<Record<ReactionType, number>> = {};
  let viewerReaction: ReactionType | null = null;
  const reactors: Reactor[] = rows.map((r) => {
    byType[r.type] = (byType[r.type] ?? 0) + 1;
    const mine = viewer ? isViewerReaction(r, viewer) : false;
    if (mine) viewerReaction = r.type;
    return { type: r.type, party: partyDisplay(r), isViewer: mine };
  });
  reactors.sort((a, b) => Number(b.isViewer) - Number(a.isViewer));
  return { total: rows.length, byType, viewerReaction, reactors };
}

/** All comments for a post as a one-level tree (top-level + replies). */
export async function getPostComments(postId: string): Promise<CommentNode[]> {
  const rows = await prisma.comment.findMany({
    where: { postId },
    include: {
      user: { select: { id: true, name: true, avatarUrl: true } },
      company: { select: { name: true, slug: true, logoUrl: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  const tops: CommentNode[] = [];
  const byId = new Map<string, CommentNode>();
  for (const c of rows) {
    if (c.parentId) continue;
    const node: CommentNode = {
      id: c.id,
      body: c.body,
      createdAt: c.createdAt,
      author: partyDisplay(c),
      replies: [],
    };
    byId.set(c.id, node);
    tops.push(node);
  }
  for (const c of rows) {
    if (!c.parentId) continue;
    const parent = byId.get(c.parentId);
    if (!parent) continue;
    parent.replies.push({
      id: c.id,
      body: c.body,
      createdAt: c.createdAt,
      author: partyDisplay(c),
      replies: [],
    });
  }
  return tops;
}
