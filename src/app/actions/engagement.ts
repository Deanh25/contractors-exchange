"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { resolveActor, getActingContext } from "@/lib/identity";
import { saveImage } from "@/lib/storage";
import {
  getPostReactors,
  getCommentTree,
  type PostReactors,
  type CommentNode,
} from "@/lib/engagement";
import {
  reactToPost,
  commentOnPost,
  reactToComment,
} from "@/lib/services/engagement";
import type { Party } from "@/lib/messaging";

/**
 * Web transport shim over the feed-engagement SERVICE (src/lib/services/engagement.ts).
 * Owns only web concerns: resolve the acting identity, save uploads to URLs, and map
 * results to redirect/revalidate. The lazy reads resolve a (nullable) viewer party
 * and delegate to the lib readers. See docs/CX-build-checklist.md section E.
 */

/** Acting party for a possibly-signed-out viewer (reads, never mutations). */
async function viewerParty(): Promise<Party | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const ctx = await getActingContext(user.id);
  return ctx.type === "company"
    ? { type: "company", id: ctx.company.id }
    : { type: "user", id: user.id };
}

// --- React (toggle / change a reaction) --------------------------------------

export async function reactToPostAction(formData: FormData) {
  const actor = await resolveActor("/feed");
  const result = await reactToPost(actor, {
    postId: String(formData.get("postId") ?? ""),
    type: String(formData.get("type") ?? ""),
  });
  if (result.status === "ignored") return;
  revalidatePath("/feed");
  revalidatePath(`/posts/${result.postId}`);
}

/** Lazy read for the "who reacted" modal (only runs when a viewer opens it). */
export async function getPostReactorsAction(postId: string): Promise<PostReactors> {
  return getPostReactors(postId, await viewerParty());
}

// --- Comment / reply ---------------------------------------------------------

export async function commentOnPostAction(formData: FormData) {
  const actor = await resolveActor("/feed");
  const postId = String(formData.get("postId") ?? "");
  // Inline (feed/thread) submits stay put; the post-page form still redirects.
  const inline = String(formData.get("inline") ?? "") === "1";
  const image = formData.get("image");
  const imageUrl =
    image instanceof File && image.size > 0 ? await saveImage(image) : null;

  const result = await commentOnPost(actor, {
    postId,
    body: String(formData.get("body") ?? ""),
    parentId: String(formData.get("parentId") ?? ""),
    replyToCommentId: String(formData.get("replyToCommentId") ?? ""),
    imageUrl,
  });

  if (result.status === "empty") {
    if (inline) return;
    redirect(`/posts/${postId}`);
  }
  if (result.status === "no_post") {
    if (inline) return;
    redirect("/feed");
  }

  revalidatePath("/feed");
  revalidatePath(`/posts/${postId}`);
  if (!inline) redirect(`/posts/${postId}`);
}

// --- React to a comment ------------------------------------------------------

export async function reactToCommentAction(formData: FormData) {
  const actor = await resolveActor("/feed");
  const result = await reactToComment(actor, {
    commentId: String(formData.get("commentId") ?? ""),
    type: String(formData.get("type") ?? ""),
  });
  if (result.status === "ignored") return;
  revalidatePath("/feed");
  revalidatePath(`/posts/${result.postId}`);
}

/** Lazy-load a post's comment forest (only runs when a thread is expanded). */
export async function loadPostCommentsAction(
  postId: string,
): Promise<CommentNode[]> {
  return getCommentTree(postId, await viewerParty());
}
