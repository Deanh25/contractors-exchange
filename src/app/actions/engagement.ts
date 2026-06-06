"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, getCurrentUser } from "@/lib/auth";
import { getActingContext } from "@/lib/identity";
import { createNotification } from "@/lib/notifications";
import { saveImage } from "@/lib/storage";
import { REACTIONS } from "@/lib/reactions";
import {
  getPostReactors,
  getCommentTree,
  type PostReactors,
  type CommentNode,
} from "@/lib/engagement";
import type { Party } from "@/lib/messaging";
import type { ReactionType } from "@/generated/prisma/client";

const VALID_REACTIONS = new Set(REACTIONS.map((r) => r.type));

async function actingParty(userId: string): Promise<Party> {
  const ctx = await getActingContext(userId);
  return ctx.type === "company"
    ? { type: "company", id: ctx.company.id }
    : { type: "user", id: userId };
}

/** Acting party for a possibly-signed-out viewer (reads, never mutations). */
async function viewerParty(): Promise<Party | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  return actingParty(user.id);
}

function postAuthorParty(post: {
  authorUserId: string | null;
  authorCompanyId: string | null;
}): Party | null {
  if (post.authorCompanyId) return { type: "company", id: post.authorCompanyId };
  if (post.authorUserId) return { type: "user", id: post.authorUserId };
  return null;
}

function partiesEqual(a: Party, b: Party): boolean {
  return a.type === b.type && a.id === b.id;
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

// --- React (toggle / change a reaction) --------------------------------------

export async function reactToPostAction(formData: FormData) {
  const user = await requireUser("/feed");
  const postId = String(formData.get("postId") ?? "");
  const type = String(formData.get("type") ?? "") as ReactionType;
  if (!VALID_REACTIONS.has(type)) return;

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { authorUserId: true, authorCompanyId: true },
  });
  if (!post) return;

  const actor = await actingParty(user.id);
  const where =
    actor.type === "company"
      ? { postId, companyId: actor.id }
      : { postId, userId: user.id, companyId: null };
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
        postId,
        userId: user.id,
        companyId: actor.type === "company" ? actor.id : null,
        type,
      },
    });
    added = true;
  }

  const author = postAuthorParty(post);
  if (added && author && !partiesEqual(author, actor)) {
    const actorName = await partyName(actor, user.name);
    const label = REACTIONS.find((r) => r.type === type)?.label ?? "reacted";
    await createNotification({
      recipient: author,
      type: "post_like",
      actorUserId: user.id,
      actorCompanyId: actor.type === "company" ? actor.id : null,
      title: `${actorName} reacted "${label}" to your post`,
      href: `/posts/${postId}`,
    });
  }

  revalidatePath("/feed");
  revalidatePath(`/posts/${postId}`);
}

/** Lazy read for the "who reacted" modal (only runs when a viewer opens it). */
export async function getPostReactorsAction(postId: string): Promise<PostReactors> {
  return getPostReactors(postId, await viewerParty());
}

// --- Comment / reply ---------------------------------------------------------

export async function commentOnPostAction(formData: FormData) {
  const user = await requireUser("/feed");
  const postId = String(formData.get("postId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  const parentId = String(formData.get("parentId") ?? "").trim() || null;
  const replyToCommentId =
    String(formData.get("replyToCommentId") ?? "").trim() || null;
  // Inline (feed/thread) submits stay put; the post-page form still redirects.
  const inline = String(formData.get("inline") ?? "") === "1";
  const image = formData.get("image");
  const imageUrl =
    image instanceof File && image.size > 0 ? await saveImage(image) : null;

  // A comment needs text or an image.
  if (!body && !imageUrl) {
    if (inline) return;
    redirect(`/posts/${postId}`);
  }

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { authorUserId: true, authorCompanyId: true },
  });
  if (!post) {
    if (inline) return;
    redirect("/feed");
  }

  const actor = await actingParty(user.id);

  // Auto-tag: resolve the replied-to comment's author server-side (never trust
  // a client-sent party). Usually the same as the parent commenter.
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
      postId,
      parentId,
      userId: user.id,
      companyId: actor.type === "company" ? actor.id : null,
      body,
      imageUrl,
      mentionedUserId: mention?.type === "user" ? mention.id : null,
      mentionedCompanyId: mention?.type === "company" ? mention.id : null,
    },
  });

  const actorName = await partyName(actor, user.name);
  const author = postAuthorParty(post);
  // De-dupe recipients across post author, parent commenter, and the mention so
  // one human/company gets at most one notification for this comment.
  const notified: Party[] = [];
  const skip = (p: Party) =>
    partiesEqual(p, actor) || notified.some((q) => partiesEqual(p, q));

  if (author && !skip(author)) {
    notified.push(author);
    await createNotification({
      recipient: author,
      type: "post_comment",
      actorUserId: user.id,
      actorCompanyId: actor.type === "company" ? actor.id : null,
      title: `${actorName} commented on your post`,
      body,
      href: `/posts/${postId}`,
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
          actorUserId: user.id,
          actorCompanyId: actor.type === "company" ? actor.id : null,
          title: `${actorName} replied to your comment`,
          body,
          href: `/posts/${postId}`,
        });
      }
    }
  }

  if (mention && !skip(mention)) {
    notified.push(mention);
    await createNotification({
      recipient: mention,
      type: "post_mention",
      actorUserId: user.id,
      actorCompanyId: actor.type === "company" ? actor.id : null,
      title: `${actorName} mentioned you in a comment`,
      body,
      href: `/posts/${postId}`,
    });
  }

  revalidatePath("/feed");
  revalidatePath(`/posts/${postId}`);
  if (!inline) redirect(`/posts/${postId}`);
}

// --- React to a comment ------------------------------------------------------

export async function reactToCommentAction(formData: FormData) {
  const user = await requireUser("/feed");
  const commentId = String(formData.get("commentId") ?? "");
  const type = String(formData.get("type") ?? "") as ReactionType;
  if (!VALID_REACTIONS.has(type)) return;

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { postId: true, userId: true, companyId: true },
  });
  if (!comment) return;

  const actor = await actingParty(user.id);
  const where =
    actor.type === "company"
      ? { commentId, companyId: actor.id }
      : { commentId, userId: user.id, companyId: null };
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
        commentId,
        userId: user.id,
        companyId: actor.type === "company" ? actor.id : null,
        type,
      },
    });
    added = true;
  }

  const author: Party = comment.companyId
    ? { type: "company", id: comment.companyId }
    : { type: "user", id: comment.userId };
  if (added && !partiesEqual(author, actor)) {
    const actorName = await partyName(actor, user.name);
    const label = REACTIONS.find((r) => r.type === type)?.label ?? "reacted";
    await createNotification({
      recipient: author,
      type: "post_like",
      actorUserId: user.id,
      actorCompanyId: actor.type === "company" ? actor.id : null,
      title: `${actorName} reacted "${label}" to your comment`,
      href: `/posts/${comment.postId}`,
    });
  }

  revalidatePath("/feed");
  revalidatePath(`/posts/${comment.postId}`);
}

/** Lazy-load a post's comment forest (only runs when a thread is expanded). */
export async function loadPostCommentsAction(
  postId: string,
): Promise<CommentNode[]> {
  return getCommentTree(postId, await viewerParty());
}
