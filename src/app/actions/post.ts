"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { resolveActor } from "@/lib/identity";
import { saveMediaFiles } from "@/lib/storage";
import { orderedMediaFromForm } from "@/lib/media-order";
import { createPost, updatePost, deletePost } from "@/lib/services/posts";

/** New post/video files from a MediaUpload submission (field name "photos"). */
function mediaFiles(formData: FormData): File[] {
  return formData
    .getAll("photos")
    .filter((f): f is File => f instanceof File && f.size > 0);
}

/**
 * Web transport shim over the feed-post SERVICE (src/lib/services/posts.ts). Owns
 * only web concerns: auth, author authorization (which company the user may post
 * as), saving the uploaded image to a URL, then calling the service and
 * revalidating/redirecting. See docs/CX-build-checklist.md section E.
 */
export async function createPostAction(formData: FormData) {
  const user = await requireUser("/feed");
  const body = String(formData.get("body") ?? "").trim();
  const owner = String(formData.get("owner") ?? "self");

  if (!body) redirect("/feed?error=empty");

  // Resolve + authorize the author: self, or a company the user may post as
  // (owner OR canActAsCompany - PRD §2 permissions).
  let author: { type: "user" | "company"; id: string };
  if (owner === "self") {
    author = { type: "user", id: user.id };
  } else {
    const m = await prisma.membership.findUnique({
      where: { userId_companyId: { userId: user.id, companyId: owner } },
    });
    if (!m || (m.role !== "owner" && !m.canActAsCompany)) {
      redirect("/feed?error=owner");
    }
    author = { type: "company", id: owner };
  }

  const mediaUrls = orderedMediaFromForm(
    formData,
    await saveMediaFiles(mediaFiles(formData)),
  );

  await createPost({
    actorUserId: user.id,
    actorUserName: user.name,
    author,
    body,
    tradeRaw: String(formData.get("tradeTag") ?? "").trim(),
    regionRaw: String(formData.get("regionTag") ?? "").trim(),
    mediaUrls,
    tagIdsRaw: String(formData.get("tagIds") ?? ""),
  });

  revalidatePath("/feed");
  redirect("/feed");
}

function safeBack(value: FormDataEntryValue | null, fallback: string): string {
  const v = typeof value === "string" ? value : "";
  return v.startsWith("/") && !v.startsWith("//") ? v : fallback;
}

export async function updatePostAction(formData: FormData) {
  const actor = await resolveActor();
  const postId = String(formData.get("postId") ?? "");
  const back = safeBack(formData.get("back"), "/me?tab=posts");

  // The composer always submits the full desired media set (existing + new) in
  // drag order, so we rebuild the complete list from the manifest.
  const media = orderedMediaFromForm(
    formData,
    await saveMediaFiles(mediaFiles(formData)),
  );

  const result = await updatePost({
    party: actor.party,
    postId,
    body: String(formData.get("body") ?? ""),
    tradeRaw: String(formData.get("tradeTag") ?? "").trim(),
    regionRaw: String(formData.get("regionTag") ?? "").trim(),
    media,
  });
  if (result.status === "empty") redirect(`/posts/${postId}/edit?error=empty`);

  revalidatePath("/feed");
  revalidatePath(back.split("?")[0]);
  redirect(back);
}

export async function deletePostAction(formData: FormData) {
  const actor = await resolveActor();
  const postId = String(formData.get("postId") ?? "");
  const back = safeBack(formData.get("back"), "/me?tab=posts");

  await deletePost({ party: actor.party, postId });

  revalidatePath("/feed");
  revalidatePath(back.split("?")[0]);
  redirect(back);
}
