import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Profile photos SERVICE (work/job portfolio). Framework-agnostic: images/videos
 * arrive as already-saved URLs from the action shim. An owner is exactly one of
 * a user or a company; deletes are owner-scoped so you can only remove your own.
 */

export type PhotoOwner = { type: "user"; id: string } | { type: "company"; id: string };

function ownerWhere(o: PhotoOwner) {
  return o.type === "user" ? { ownerUserId: o.id } : { ownerCompanyId: o.id };
}

/** Append photos to the owner's portfolio (kept in insertion order). */
export async function addProfilePhotos(owner: PhotoOwner, urls: string[]): Promise<number> {
  const clean = urls.filter(Boolean);
  if (!clean.length) return 0;

  const max = await prisma.profilePhoto.aggregate({
    where: ownerWhere(owner),
    _max: { sortOrder: true },
  });
  let sort = (max._max.sortOrder ?? -1) + 1;

  await prisma.profilePhoto.createMany({
    data: clean.map((url) => ({ ...ownerWhere(owner), url, sortOrder: sort++ })),
  });
  return clean.length;
}

/** Remove one photo, but only if it belongs to this owner. */
export async function deleteProfilePhoto(owner: PhotoOwner, photoId: string): Promise<void> {
  await prisma.profilePhoto.deleteMany({ where: { id: photoId, ...ownerWhere(owner) } });
}
