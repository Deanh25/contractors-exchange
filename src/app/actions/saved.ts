"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

/** Only allow revalidating same-origin paths we navigated from. */
function safePath(value: FormDataEntryValue | null, fallback = "/saved"): string {
  const v = typeof value === "string" ? value : "";
  return v.startsWith("/") && !v.startsWith("//") ? v : fallback;
}

/**
 * Toggle a listing's saved state for the current user. Driven by the DB's
 * current state so one button both saves and unsaves. Revalidates the page it
 * was clicked from plus the layout (the workspace Saved badge).
 */
export async function toggleSaveAction(formData: FormData): Promise<void> {
  const user = await requireUser("/listings");
  const listingId = String(formData.get("listingId") ?? "");
  const path = safePath(formData.get("path"), "/listings");
  if (!listingId) redirect(path);

  const existing = await prisma.savedListing.findUnique({
    where: { userId_listingId: { userId: user.id, listingId } },
  });
  if (existing) {
    await prisma.savedListing.delete({ where: { id: existing.id } });
  } else {
    // Ignore saves of a non-existent listing.
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true },
    });
    if (listing) {
      await prisma.savedListing.create({
        data: { userId: user.id, listingId },
      });
    }
  }

  revalidatePath(path);
  revalidatePath("/", "layout");
}

/** Create a new collection (folder) for the current user. */
export async function createCollectionAction(formData: FormData): Promise<void> {
  const user = await requireUser("/saved");
  const name = String(formData.get("name") ?? "").trim().slice(0, 60);
  if (!name) redirect("/saved");

  // Names are unique per user; silently reuse an existing one.
  await prisma.collection.upsert({
    where: { userId_name: { userId: user.id, name } },
    create: { userId: user.id, name },
    update: {},
  });
  revalidatePath("/saved");
}

/** Move a saved listing into a collection (empty value = uncategorized). */
export async function setSaveCollectionAction(
  formData: FormData,
): Promise<void> {
  const user = await requireUser("/saved");
  const listingId = String(formData.get("listingId") ?? "");
  const raw = String(formData.get("collectionId") ?? "");
  const path = safePath(formData.get("path"), "/saved");
  if (!listingId) redirect(path);

  let collectionId: string | null = null;
  if (raw) {
    // Verify the collection belongs to the user before assigning.
    const col = await prisma.collection.findFirst({
      where: { id: raw, userId: user.id },
      select: { id: true },
    });
    collectionId = col?.id ?? null;
  }

  await prisma.savedListing.updateMany({
    where: { userId: user.id, listingId },
    data: { collectionId },
  });
  revalidatePath(path);
}

/** Delete a collection; its saved listings fall back to uncategorized. */
export async function deleteCollectionAction(
  formData: FormData,
): Promise<void> {
  const user = await requireUser("/saved");
  const collectionId = String(formData.get("collectionId") ?? "");
  if (!collectionId) redirect("/saved");

  await prisma.collection.deleteMany({
    where: { id: collectionId, userId: user.id },
  });
  revalidatePath("/saved");
  redirect("/saved");
}
