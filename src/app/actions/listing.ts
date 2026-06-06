"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { saveMediaFiles } from "@/lib/storage";
import { parseCoord } from "@/lib/form";
import { canManageListing } from "@/lib/listing-access";
import { getLeafSlugSet } from "@/lib/categories";
import {
  createListing,
  updateListing,
  updateListingStatus,
  deleteListing,
  type ListingTypeFields,
} from "@/lib/services/listings";
import type {
  ListingStatus,
  ListingCondition,
  ListingCloseReason,
} from "@/generated/prisma/client";
import type { ListingChoice } from "@/lib/listings";

/**
 * Web transport shim over the listing SERVICE (src/lib/services/listings.ts).
 * Owns the web-only concerns: FormData parsing, input validation, authorization
 * (owner / canManageListing), and saving uploaded media to URLs - then calls the
 * service (pricing assembly + persistence) and maps the result to redirect/
 * revalidate. See docs/CX-build-checklist.md section E.
 */

const CLOSE_REASONS = new Set([
  "sold_on_cx",
  "sold_elsewhere",
  "no_longer_available",
  "other",
]);

const CONDITIONS = new Set(["new", "like_new", "good", "fair", "salvage"]);
function parseCondition(v: FormDataEntryValue | null): ListingCondition | null {
  const c = String(v ?? "").trim();
  return CONDITIONS.has(c) ? (c as ListingCondition) : null;
}

const CHOICES = new Set<ListingChoice>([
  "price",
  "bid",
  "trade-goods",
  "trade-services",
]);
const EDITABLE_STATUS = new Set(["active", "sold", "closed"]);

/** Parse a money input ("1,250.00", "$1250") into a positive number, or null. */
function parseMoney(raw: string): number | null {
  const cleaned = raw.replace(/[^0-9.]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Resolve the type-exclusive fields (PRD §10 constraint), or an error code. */
function parseTypeFields(
  formData: FormData,
  choice: ListingChoice,
): ListingTypeFields | { error: string } {
  if (choice === "price") {
    // The seller enters their NET; the public price is net x (1 + category margin %).
    const sellerNet = parseMoney(String(formData.get("sellerNet") ?? ""));
    if (sellerNet === null) return { error: "price" };
    // Negotiable by default; the seller can switch offers off (firm price). The
    // checkbox sends "on" only when checked; absence means offers are off.
    const acceptsOffers = formData.get("acceptsOffers") === "on";
    return {
      type: "price",
      tradeKind: null,
      price: null, // computed from the category margin in the service
      startReserve: null,
      closesAt: null,
      sellerNet,
      acceptsOffers,
    };
  }
  if (choice === "bid") {
    const startReserve = parseMoney(String(formData.get("startReserve") ?? ""));
    if (startReserve === null) return { error: "reserve" };
    const closesRaw = String(formData.get("closesAt") ?? "").trim();
    const parsed = closesRaw ? new Date(closesRaw) : null;
    if (!parsed || Number.isNaN(parsed.getTime())) return { error: "closes" };
    return { type: "bid", tradeKind: null, price: null, startReserve, closesAt: parsed };
  }
  return {
    type: "trade",
    tradeKind: choice === "trade-services" ? "service" : "goods",
    price: null,
    startReserve: null,
    closesAt: null,
  };
}

/** Common listing fields read from either the create or edit form. */
function readCommon(formData: FormData) {
  return {
    title: String(formData.get("title") ?? "").trim(),
    tradeCategory: String(formData.get("tradeCategory") ?? "").trim(),
    city: String(formData.get("city") ?? "").trim(),
    state: String(formData.get("state") ?? "").trim(),
    lat: parseCoord(formData.get("lat")),
    lng: parseCoord(formData.get("lng")),
    description: String(formData.get("description") ?? "").trim(),
    unit: String(formData.get("unit") ?? "").trim(),
    freightNote: String(formData.get("freightNote") ?? "").trim(),
    condition: parseCondition(formData.get("condition")),
    manufacturer: String(formData.get("manufacturer") ?? "").trim(),
    choice: String(formData.get("type") ?? "") as ListingChoice,
  };
}

function mediaFiles(formData: FormData): File[] {
  return formData
    .getAll("photos")
    .filter((f): f is File => f instanceof File && f.size > 0);
}

/** Quantity available - only meaningful for set-price listings (else 1). */
function readQuantity(formData: FormData, tf: ListingTypeFields): number {
  if (tf.type !== "price") return 1;
  const n = Math.floor(Number(formData.get("quantityAvailable")));
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

// --- Create ------------------------------------------------------------------

export async function createListingAction(formData: FormData) {
  const user = await requireUser("/listings/new");
  const c = readCommon(formData);
  const owner = String(formData.get("owner") ?? "self");

  const fail = (code: string): never => redirect(`/listings/new?error=${code}`);
  if (!c.title) fail("title");
  if (!(await getLeafSlugSet()).has(c.tradeCategory)) fail("trade");
  if (!CHOICES.has(c.choice)) fail("type");

  let ownerParam: { type: "user" | "company"; id: string };
  if (owner === "self") {
    ownerParam = { type: "user", id: user.id };
  } else {
    const membership = await prisma.membership.findUnique({
      where: { userId_companyId: { userId: user.id, companyId: owner } },
    });
    if (!membership || membership.role !== "owner") fail("owner");
    ownerParam = { type: "company", id: owner };
  }

  const tf = parseTypeFields(formData, c.choice);
  if ("error" in tf) return fail(tf.error);

  // Validations passed: persist media, then create.
  const photos = await saveMediaFiles(mediaFiles(formData));
  const { listingId } = await createListing({
    owner: ownerParam,
    common: c,
    typeFields: tf,
    quantity: readQuantity(formData, tf),
    photos,
  });

  revalidatePath("/listings");
  redirect(`/listings/${listingId}`);
}

// --- Edit / manage -----------------------------------------------------------

export async function updateListingAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("listingId") ?? "");
  const listing = await prisma.listing.findUnique({ where: { id } });
  if (!listing) redirect("/listings");
  if (!(await canManageListing(user.id, listing))) redirect(`/listings/${id}`);

  const c = readCommon(formData);
  const fail = (code: string): never =>
    redirect(`/listings/${id}/edit?error=${code}`);
  if (!c.title) fail("title");
  if (!(await getLeafSlugSet()).has(c.tradeCategory)) fail("trade");
  if (!CHOICES.has(c.choice)) fail("type");

  const tf = parseTypeFields(formData, c.choice);
  if ("error" in tf) return fail(tf.error);

  const statusRaw = String(formData.get("status") ?? "");
  const status = (EDITABLE_STATUS.has(statusRaw) ? statusRaw : listing.status) as ListingStatus;

  // Media = kept existing URLs + newly uploaded files, in order.
  const kept = formData.getAll("existingPhotos").map(String).filter(Boolean);
  const uploaded = await saveMediaFiles(mediaFiles(formData));

  await updateListing({
    listingId: id,
    common: c,
    typeFields: tf,
    quantity: readQuantity(formData, tf),
    status,
    photos: [...kept, ...uploaded],
  });

  revalidatePath(`/listings/${id}`);
  revalidatePath("/listings");
  redirect(`/listings/${id}`);
}

export async function updateListingStatusAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("listingId") ?? "");
  const statusRaw = String(formData.get("status") ?? "");
  const listing = await prisma.listing.findUnique({ where: { id } });
  if (!listing) redirect("/listings");
  if (!(await canManageListing(user.id, listing))) redirect(`/listings/${id}`);
  if (!EDITABLE_STATUS.has(statusRaw)) redirect(`/listings/${id}`);

  // Validate the close reason here (controlled vocab); the service applies it.
  let closeReason: ListingCloseReason | null = null;
  let closeReasonNote: string | null = null;
  if (statusRaw === "closed") {
    const cr = String(formData.get("closeReason") ?? "").trim();
    closeReason = CLOSE_REASONS.has(cr) ? (cr as ListingCloseReason) : null;
    closeReasonNote = String(formData.get("closeReasonNote") ?? "").trim() || null;
  }

  await updateListingStatus({
    listingId: id,
    status: statusRaw as ListingStatus,
    closeReason,
    closeReasonNote,
  });

  revalidatePath(`/listings/${id}`);
  revalidatePath("/listings");
  redirect(`/listings/${id}`);
}

export async function deleteListingAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("listingId") ?? "");
  const listing = await prisma.listing.findUnique({ where: { id } });
  if (!listing) redirect("/listings");
  if (!(await canManageListing(user.id, listing))) redirect(`/listings/${id}`);

  await deleteListing(id);
  revalidatePath("/listings");
  redirect("/me");
}
