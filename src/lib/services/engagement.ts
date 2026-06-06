import "server-only";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { partiesEqual, type Party } from "@/lib/messaging";
import { REACTIONS } from "@/lib/reactions";
import type { ReactionType } from "@/generated/prisma/client";
import type { Actor } from "@/lib/services/actor";

/**
 * Feed engagement SERVICE (PRD §4): post/comment reactions + comments. Framework-
 * agnostic: no FormData/redirect/revalidate/cookies. Media is the caller's concern
 * (pass a resolved imageUrl). The lazy READ helpers (getPostReactors / getCommentTree)
 * live in src/lib/engagement.ts; this file owns the mutations. See
 * docs/CX-build-checklist.md section E.
 */

const VALID_REACTIONS = new Set<ReactionType>(REACTIONS.map((r) => r.type));

function postAuthorParty(post: {
  authorUserId: string | null;
  authorCompanyId: string | null;
}): Party | null {
  if (post.authorCompanyId) return { type: "company", id: post.authorCompanyId };
  if (post.authorUserId) return { type: "user", id: post.authorUserId };
  return null;
}

async function partyName(party: Party, fallback: string): Promise<string> {
  if (party.type === "company") {
    const co = await prisma.company.findUnique({
      where: { id: party.id },
      select: { name: true },
    });
    return co?.name ?? fallback;
  }
  return fallback;
}

export type ReactInput = { postId: string; type: string };
export type ReactResult =
  | { status: "ok"; postId: string }
  | { status: "ignored" };

/** Toggle / change the actor's reaction on a post; notify the author when added. */
export async function reactToPost(
  actor: Actor,
  input: ReactInput,
): Promise<ReactResult> {
  const type = input.type as ReactionType;
  if (!VALID_REACTIONS.has(type)) return { status: "ignored" };

  const post = await prisma.post.findUnique({
    where: { id: input.postId },
    select: { authorUserId: true, authorCompanyId: true },
  });
  if (!post) return { status: "ignored" };

  const where =
    actor.party.type === "company"
      ? { postId: input.postId, companyId: actor.party.id }
      : { postId: input.postId, userId: actor.userId, companyId: null };
  const existing = await prisma.reaction.findFirst({ where });

  let added = false;
  if (existing && existing.type === type) {
    await prisma.reaction.delete({ where: { id: existing.id } }); // toggle off
  } else if (existing) {
    await prisma.reaction.update({ where: { id: existing.id }, data: { type } });
    added = true;
  } else {
    await prisma.reaction.create({
      data: {
        postId: input.postId,
        userId: actor.userId,
        companyId: actor.party.type === "company" ? actor.party.id : null,
        type,
      },
    });
    added = true;
  }

  const author = postAuthorParty(post);
  if (added && author && !partiesEqual(author, actor.party)) {
    const actorName = await partyName(actor.party, actor.userName);
    const label = REACTIONS.find((r) => r.type === type)?.label ?? "reacted";
    await createNotification({
      recipient: author,
      type: "post_like",
      actorUserId: actor.userId,
      actorCompanyId: actor.party.type === "company" ? actor.party.id : null,
      title: `${actorName} reacted "${label}" to your post`,
      href: `/posts/${input.postId}`,
    });
  }
  return { status: "ok", postId: input.postId };
}

export type CommentInput = {
  postId: string;
  body?: string | null;
  parentId?: string | null;
  replyToCommentId?: string | null;
  /** Already-saved media URL, if any (the caller handles upload). */
  imageUrl?: string | null;
};
export type CommentResult =
  | { status: "created"; postId: string }
  | { status: "empty" }
  | { status: "no_post" };

/** Add a comment/reply; auto-tag the replied-to author; notify the de-duped set. */
export async function commentOnPost(
  actor: Actor,
  input: CommentInput,
): Promise<CommentResult> {
  const body = (input.body ?? "").trim();
  const imageUrl = input.imageUrl ?? null;
  const parentId = (input.parentId ?? "").trim() || null;
  const replyToCommentId = (input.replyToCommentId ?? "").trim() || null;

  // A comment needs text or an image.
  if (!body && !imageUrl) return { status: "empty" };

  const post = await prisma.post.findUnique({
    where: { id: input.postId },
    select: { authorUserId: true, authorCompanyId: true },
  });
  if (!post) return { status: "no_post" };

  // Auto-tag: resolve the replied-to comment's author server-side (never trust a
  // client-sent party). Usually the same as the parent commenter.
  let mention: Party | null = null;
  if (replyToCommentId) {
    const target = await prisma.comment.findUnique({
      where: { id: replyToCommentId },
      select: { userId: true, companyId: true },
    });
    if (target) {
      mention = target.companyId
        ? { type: "company", id: target.companyId }
        : { type: "user", id: target.userId };
    }
  }

  await prisma.comment.create({
    data: {
      postId: input.postId,
      parentId,
      userId: actor.userId,
      companyId: actor.party.type === "company" ? actor.party.id : null,
      body,
      imageUrl,
      mentionedUserId: mention?.type === "user" ? mention.id : null,
      mentionedCompanyId: mention?.type === "company" ? mention.id : null,
    },
  });

  const actorName = await partyName(actor.party, actor.userName);
  const author = postAuthorParty(post);
  // De-dupe recipients across post author, parent commenter, and the mention so
  // one human/company gets at most one notification for this comment.
  const notified: Party[] = [];
  const skip = (p: Party) =>
    partiesEqual(p, actor.party) || notified.some((q) => partiesEqual(p, q));

  if (author && !skip(author)) {
    notified.push(author);
    await createNotification({
      recipient: author,
      type: "post_comment",
      actorUserId: actor.userId,
      actorCompanyId: actor.party.type === "company" ? actor.party.id : null,
      title: `${actorName} commented on your post`,
      body,
      href: `/posts/${input.postId}`,
    });
  }

  if (parentId) {
    const parent = await prisma.comment.findUnique({
      where: { id: parentId },
      select: { userId: true, companyId: true },
    });
    if (parent) {
      const parentParty: Party = parent.companyId
        ? { type: "company", id: parent.companyId }
        : { type: "user", id: parent.userId };
      if (!skip(parentParty)) {
        notified.push(parentParty);
        await createNotification({
          recipient: parentParty,
          type: "post_comment",
          actorUserId: actor.userId,
          actorCompanyId: actor.party.type === "company" ? actor.party.id : null,
          title: `${actorName} replied to your comment`,
          body,
          href: `/posts/${input.postId}`,
        });
      }
    }
  }

  if (mention && !skip(mention)) {
    notified.push(mention);
    await createNotification({
      recipient: mention,
      type: "post_mention",
      actorUserId: actor.userId,
      actorCompanyId: actor.party.type === "company" ? actor.party.id : null,
      title: `${actorName} mentioned you in a comment`,
      body,
      href: `/posts/${input.postId}`,
    });
  }

  return { status: "created", postId: input.postId };
}

export type ReactCommentInput = { commentId: string; type: string };
export type ReactCommentResult =
  | { status: "ok"; postId: string }
  | { status: "ignored" };

/** Toggle / change the actor's reaction on a comment; notify its author. */
export async function reactToComment(
  actor: Actor,
  input: ReactCommentInput,
): Promise<ReactCommentResult> {
  const type = input.type as ReactionType;
  if (!VALID_REACTIONS.has(type)) return { status: "ignored" };

  const comment = await prisma.comment.findUnique({
    where: { id: input.commentId },
    select: { postId: true, userId: true, companyId: true },
  });
  if (!comment) return { status: "ignored" };

  const where =
    actor.party.type === "company"
      ? { commentId: input.commentId, companyId: actor.party.id }
      : { commentId: input.commentId, userId: actor.userId, companyId: null };
  const existing = await prisma.commentReaction.findFirst({ where });

  let added = false;
  if (existing && existing.type === type) {
    await prisma.commentReaction.delete({ where: { id: existing.id } }); // toggle off
  } else if (existing) {
    await prisma.commentReaction.update({
      where: { id: existing.id },
      data: { type },
    });
    added = true;
  } else {
    await prisma.commentReaction.create({
      data: {
        commentId: input.commentId,
        userId: actor.userId,
        companyId: actor.party.type === "company" ? actor.party.id : null,
        type,
      },
    });
    added = true;
  }

  const author: Party = comment.companyId
    ? { type: "company", id: comment.companyId }
    : { type: "user", id: comment.userId };
  if (added && !partiesEqual(author, actor.party)) {
    const actorName = await partyName(actor.party, actor.userName);
    const label = REACTIONS.find((r) => r.type === type)?.label ?? "reacted";
    await createNotification({
      recipient: author,
      type: "post_like",
      actorUserId: actor.userId,
      actorCompanyId: actor.party.type === "company" ? actor.party.id : null,
      title: `${actorName} reacted "${label}" to your comment`,
      href: `/posts/${comment.postId}`,
    });
  }
  return { status: "ok", postId: comment.postId };
}
