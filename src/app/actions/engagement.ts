"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { getActingContext } from "@/lib/identity";
import { createNotification } from "@/lib/notifications";
import { REACTIONS } from "@/lib/engagement";
import type { Party } from "@/lib/messaging";
import type { ReactionType } from "@/generated/prisma/client";

const VALID_REACTIONS = new Set(REACTIONS.map((r) => r.type));

async function actingParty(userId: string): Promise<Party> {
  const ctx = await getActingContext(userId);
  return ctx.type === "company"
    ? { type: "company", id: ctx.company.id }
    : { type: "user", id: userId };
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
    const emoji = REACTIONS.find((r) => r.type === type)?.emoji ?? "";
    await createNotification({
      recipient: author,
      type: "post_like",
      actorUserId: user.id,
      actorCompanyId: actor.type === "company" ? actor.id : null,
      title: `${actorName} reacted ${emoji} to your post`,
      href: `/posts/${postId}`,
    });
  }

  revalidatePath("/feed");
  revalidatePath(`/posts/${postId}`);
}

// --- Comment / reply ---------------------------------------------------------

export async function commentOnPostAction(formData: FormData) {
  const user = await requireUser("/feed");
  const postId = String(formData.get("postId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  const parentId = String(formData.get("parentId") ?? "").trim() || null;
  if (!body) redirect(`/posts/${postId}`);

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { authorUserId: true, authorCompanyId: true },
  });
  if (!post) redirect("/feed");

  const actor = await actingParty(user.id);
  await prisma.comment.create({
    data: {
      postId,
      parentId,
      userId: user.id,
      companyId: actor.type === "company" ? actor.id : null,
      body,
    },
  });

  const actorName = await partyName(actor, user.name);
  // Notify the post author (and, on a reply, the parent commenter) - skip self.
  const author = postAuthorParty(post);
  if (author && !partiesEqual(author, actor)) {
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
      if (!partiesEqual(parentParty, actor) && !(author && partiesEqual(parentParty, author))) {
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

  revalidatePath("/feed");
  revalidatePath(`/posts/${postId}`);
  redirect(`/posts/${postId}`);
}
