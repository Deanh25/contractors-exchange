"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { saveMedia } from "@/lib/storage";
import { createPost } from "@/lib/services/posts";

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
