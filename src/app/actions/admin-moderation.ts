"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireCapability, logAdminAction } from "@/lib/admin";
import { getLeafSlugSet } from "@/lib/categories";
import type { ListingStatus } from "@/generated/prisma/client";

/**
 * Listing moderation (PRD §7C, Module 5, moderator+). Soft state changes are
 * preferred (close/reopen/mark-sold); recategorize fixes the trade; hard delete
 * is superadmin only. Moderators never load financial fields (see the moderation
 * page, which selects only public columns). Every action is audit-logged.
 */

const MOD_STATUS = new Set<ListingStatus>(["active", "closed", "sold"]);

export async function moderateListingStatusAction(formData: FormData) {
  const admin = await requireCapability("moderation");
  const id = String(formData.get("listingId") ?? "");
  const status = String(formData.get("status") ?? "") as ListingStatus;
  const reason = String(formData.get("reason") ?? "").trim() || null;
  if (!MOD_STATUS.has(status)) redirect("/admin/listings");

  await prisma.listing.update({ where: { id }, data: { status } });
  await logAdminAction(admin.id, `listing.${status}`, "listing", id, reason);
  revalidatePath("/admin/listings");
  revalidatePath("/listings");
  revalidatePath(`/listings/${id}`);
  redirect("/admin/listings");
}

export async function recategorizeListingAction(formData: FormData) {
  const admin = await requireCapability("moderation");
  const id = String(formData.get("listingId") ?? "");
  const tradeCategory = String(formData.get("tradeCategory") ?? "").trim();
  if (!(await getLeafSlugSet()).has(tradeCategory)) redirect("/admin/listings");

  await prisma.listing.update({ where: { id }, data: { tradeCategory } });
  await logAdminAction(
    admin.id,
    "listing.recategorize",
    "listing",
    id,
    `-> ${tradeCategory}`,
  );
  revalidatePath("/admin/listings");
  revalidatePath("/listings");
  revalidatePath(`/listings/${id}`);
  redirect("/admin/listings");
}

export async function removeListingAction(formData: FormData) {
  const admin = await requireCapability("hardDelete");
  const id = String(formData.get("listingId") ?? "");
  const confirm = String(formData.get("confirm") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim() || null;
  if (confirm !== "DELETE") redirect("/admin/listings?error=confirm");

  await logAdminAction(admin.id, "listing.delete", "listing", id, reason);
  await prisma.listing.delete({ where: { id } }).catch(() => null);
  revalidatePath("/admin/listings");
  revalidatePath("/listings");
  redirect("/admin/listings");
}
