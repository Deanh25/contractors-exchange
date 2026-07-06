"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { canActAs } from "@/lib/identity";
import { saveMediaFiles } from "@/lib/storage";
import {
  addProfilePhotos,
  deleteProfilePhoto,
  type PhotoOwner,
} from "@/lib/services/photos";
import type { User } from "@/generated/prisma/client";

/**
 * Web shim over the photos SERVICE. Resolves the owner from the form (a
 * companyId means the company portfolio - requires canActAs; otherwise the
 * signed-in user's own), saves uploads to URLs, calls the service, revalidates.
 */
async function resolveOwner(
  formData: FormData,
  user: User,
): Promise<{ owner: PhotoOwner; back: string; revalidate: string } | null> {
  const companyId = String(formData.get("companyId") ?? "");
  if (companyId) {
    if (!(await canActAs(user.id, companyId))) return null;
    const co = await prisma.company.findUnique({
      where: { id: companyId },
      select: { slug: true },
    });
    if (!co) return null;
    return {
      owner: { type: "company", id: companyId },
      back: `/company/${co.slug}?tab=photos`,
      revalidate: `/company/${co.slug}`,
    };
  }
  return {
    owner: { type: "user", id: user.id },
    back: `/u/${user.id}?tab=photos`,
    revalidate: `/u/${user.id}`,
  };
}

export async function addProfilePhotosAction(formData: FormData) {
  const user = await requireUser();
  const resolved = await resolveOwner(formData, user);
  if (!resolved) redirect("/");

  const files = formData
    .getAll("photos")
    .filter((f): f is File => f instanceof File && f.size > 0);
  const urls = await saveMediaFiles(files);
  await addProfilePhotos(resolved.owner, urls);

  revalidatePath(resolved.revalidate);
  redirect(resolved.back);
}

export async function deleteProfilePhotoAction(formData: FormData) {
  const user = await requireUser();
  const resolved = await resolveOwner(formData, user);
  if (!resolved) redirect("/");

  const photoId = String(formData.get("photoId") ?? "");
  await deleteProfilePhoto(resolved.owner, photoId);

  revalidatePath(resolved.revalidate);
  redirect(resolved.back);
}
