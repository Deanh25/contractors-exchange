"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import {
  toggleSave,
  saveToCollection,
  createCollectionAndSave,
  removeSave,
  createCollection,
  setSaveCollection,
  deleteCollection,
} from "@/lib/services/saved";

/**
 * Web transport shim over the saved-listings SERVICE (src/lib/services/saved.ts).
 * Owns only web concerns: auth, the safe revalidate path, input presence, and
 * revalidation. All DB logic lives in the service. See docs/CX-build-checklist.md
 * section E.
 */

/** Only allow revalidating same-origin paths we navigated from. */
function safePath(value: FormDataEntryValue | null, fallback = "/saved"): string {
  const v = typeof value === "string" ? value : "";
  return v.startsWith("/") && !v.startsWith("//") ? v : fallback;
}

/** Toggle a listing's saved state for the current user. */
export async function toggleSaveAction(formData: FormData): Promise<void> {
  const user = await requireUser("/listings");
  const listingId = String(formData.get("listingId") ?? "");
  const path = safePath(formData.get("path"), "/listings");
  if (!listingId) redirect(path);

  await toggleSave(user.id, listingId);
  revalidatePath(path);
  revalidatePath("/", "layout");
}

/** Save a listing into a collection (or uncategorized when empty). Upserts. */
export async function saveToCollectionAction(formData: FormData): Promise<void> {
  const user = await requireUser("/listings");
  const listingId = String(formData.get("listingId") ?? "");
  const path = safePath(formData.get("path"), "/listings");
  if (!listingId) redirect(path);

  await saveToCollection(user.id, listingId, String(formData.get("collectionId") ?? ""));
  revalidatePath(path);
  revalidatePath("/", "layout");
}

/** Create a collection on the fly and save a listing straight into it. */
export async function createCollectionAndSaveAction(
  formData: FormData,
): Promise<void> {
  const user = await requireUser("/listings");
  const listingId = String(formData.get("listingId") ?? "");
  const name = String(formData.get("name") ?? "").trim().slice(0, 60);
  const path = safePath(formData.get("path"), "/listings");
  if (!listingId || !name) redirect(path);

  await createCollectionAndSave(user.id, listingId, name);
  revalidatePath(path);
  revalidatePath("/", "layout");
}

/** Remove a listing from the viewer's saved set entirely. */
export async function removeSaveAction(formData: FormData): Promise<void> {
  const user = await requireUser("/listings");
  const listingId = String(formData.get("listingId") ?? "");
  const path = safePath(formData.get("path"), "/listings");
  if (!listingId) redirect(path);

  await removeSave(user.id, listingId);
  revalidatePath(path);
  revalidatePath("/", "layout");
}

/** Create a new collection (folder) for the current user. */
export async function createCollectionAction(formData: FormData): Promise<void> {
  const user = await requireUser("/saved");
  const name = String(formData.get("name") ?? "").trim().slice(0, 60);
  if (!name) redirect("/saved");

  await createCollection(user.id, name);
  revalidatePath("/saved");
}

/** Move a saved listing into a collection (empty value = uncategorized). */
export async function setSaveCollectionAction(formData: FormData): Promise<void> {
  const user = await requireUser("/saved");
  const listingId = String(formData.get("listingId") ?? "");
  const path = safePath(formData.get("path"), "/saved");
  if (!listingId) redirect(path);

  await setSaveCollection(user.id, listingId, String(formData.get("collectionId") ?? ""));
  revalidatePath(path);
}

/** Delete a collection; its saved listings fall back to uncategorized. */
export async function deleteCollectionAction(formData: FormData): Promise<void> {
  const user = await requireUser("/saved");
  const collectionId = String(formData.get("collectionId") ?? "");
  if (!collectionId) redirect("/saved");

  await deleteCollection(user.id, collectionId);
  revalidatePath("/saved");
  redirect("/saved");
}
