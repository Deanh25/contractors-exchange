"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { saveMedia } from "@/lib/storage";
import { createPost, updatePost, deletePost } from "@/lib/services/posts";

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

  const image = formData.get("image");
  const imageUrl =
    image instanceof File && image.size > 0 ? await saveMedia(image) : null;

  await createPost({
    actorUserId: user.id,
    actorUserName: user.name,
    author,
    body,
    tradeRaw: String(formData.get("tradeTag") ?? "").trim(),
    regionRaw: String(formData.get("regionTag") ?? "").trim(),
    imageUrl,
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
  const user = await requireUser();
  const postId = String(formData.get("postId") ?? "");
  const back = safeBack(formData.get("back"), "/me?tab=posts");

  // Media: a new upload replaces; else `imageRemove=1` clears; else keep as-is.
  const image = formData.get("image");
  const uploaded =
    image instanceof File && image.size > 0 ? await saveMedia(image) : undefined;
  const imageUrl =
    uploaded !== undefined
      ? uploaded
      : formData.get("imageRemove") === "1"
        ? null
        : undefined;

  const result = await updatePost({
    userId: user.id,
    postId,
    body: String(formData.get("body") ?? ""),
    tradeRaw: String(formData.get("tradeTag") ?? "").trim(),
    regionRaw: String(formData.get("regionTag") ?? "").trim(),
    imageUrl,
  });
  if (result.status === "empty") redirect(`/posts/${postId}/edit?error=empty`);

  revalidatePath("/feed");
  revalidatePath(back.split("?")[0]);
  redirect(back);
}

export async function deletePostAction(formData: FormData) {
  const user = await requireUser();
  const postId = String(formData.get("postId") ?? "");
  const back = safeBack(formData.get("back"), "/me?tab=posts");

  await deletePost({ userId: user.id, postId });

  revalidatePath("/feed");
  revalidatePath(back.split("?")[0]);
  redirect(back);
}
