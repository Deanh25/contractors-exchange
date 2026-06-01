"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { saveMediaFiles } from "@/lib/storage";
import { TRADES } from "@/lib/trades";
import { parseCoord } from "@/lib/form";
import { canManageListing } from "@/lib/listing-access";
import { Prisma } from "@/generated/prisma/client";
import type {
  ListingType,
  TradeKind,
  ListingStatus,
} from "@/generated/prisma/client";
import type { ListingChoice } from "@/lib/listings";

const TRADE_SLUGS = new Set(TRADES.map((t) => t.slug));
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

type TypeFields = {
  type: ListingType;
  tradeKind: TradeKind | null;
  price: number | null;
  startReserve: number | null;
  closesAt: Date | null;
};

/** Resolve the type-exclusive fields (PRD §10 constraint), or an error code. */
function parseTypeFields(
  formData: FormData,
  choice: ListingChoice,
): TypeFields | { error: string } {
  if (choice === "price") {
    const price = parseMoney(String(formData.get("price") ?? ""));
    if (price === null) return { error: "price" };
    return { type: "price", tradeKind: null, price, startReserve: null, closesAt: null };
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
    choice: String(formData.get("type") ?? "") as ListingChoice,
  };
}

function mediaFiles(formData: FormData): File[] {
  return formData
    .getAll("photos")
    .filter((f): f is File => f instanceof File && f.size > 0);
}

// --- Create ------------------------------------------------------------------

export async function createListingAction(formData: FormData) {
  const user = await requireUser("/listings/new");
  const c = readCommon(formData);
  const owner = String(formData.get("owner") ?? "self");

  const fail = (code: string): never => redirect(`/listings/new?error=${code}`);
  if (!c.title) fail("title");
  if (!TRADE_SLUGS.has(c.tradeCategory)) fail("trade");
  if (!CHOICES.has(c.choice)) fail("type");

  let ownerUserId: string | null = null;
  let ownerCompanyId: string | null = null;
  if (owner === "self") {
    ownerUserId = user.id;
  } else {
    const membership = await prisma.membership.findUnique({
      where: { userId_companyId: { userId: user.id, companyId: owner } },
    });
    if (!membership || membership.role !== "owner") fail("owner");
    ownerCompanyId = owner;
  }

  const tf = parseTypeFields(formData, c.choice);
  if ("error" in tf) return fail(tf.error);

  const photos = await saveMediaFiles(mediaFiles(formData));

  const data: Prisma.ListingCreateInput = {
    title: c.title,
    tradeCategory: c.tradeCategory,
    city: c.city || null,
    state: c.state || null,
    lat: c.lat,
    lng: c.lng,
    description: c.description || null,
    unit: c.unit || null,
    freightNote: c.freightNote || null,
    photos: photos.length > 0 ? photos : undefined,
    type: tf.type,
    tradeKind: tf.tradeKind,
    price: tf.price,
    startReserve: tf.startReserve,
    closesAt: tf.closesAt,
    ...(ownerCompanyId
      ? { ownerCompany: { connect: { id: ownerCompanyId } } }
      : { ownerUser: { connect: { id: ownerUserId! } } }),
  };

  const listing = await prisma.listing.create({ data });
  revalidatePath("/listings");
  redirect(`/listings/${listing.id}`);
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
  if (!TRADE_SLUGS.has(c.tradeCategory)) fail("trade");
  if (!CHOICES.has(c.choice)) fail("type");

  const tf = parseTypeFields(formData, c.choice);
  if ("error" in tf) return fail(tf.error);

  const statusRaw = String(formData.get("status") ?? "");
  const status = (EDITABLE_STATUS.has(statusRaw) ? statusRaw : listing.status) as ListingStatus;

  // Media = kept existing URLs + newly uploaded files, in order.
  const kept = formData.getAll("existingPhotos").map(String).filter(Boolean);
  const uploaded = await saveMediaFiles(mediaFiles(formData));
  const media = [...kept, ...uploaded];

  await prisma.listing.update({
    where: { id },
    data: {
      title: c.title,
      tradeCategory: c.tradeCategory,
      city: c.city || null,
      state: c.state || null,
      lat: c.lat,
      lng: c.lng,
      description: c.description || null,
      unit: c.unit || null,
      freightNote: c.freightNote || null,
      type: tf.type,
      tradeKind: tf.tradeKind,
      price: tf.price,
      startReserve: tf.startReserve,
      closesAt: tf.closesAt,
      status,
      photos: media.length > 0 ? media : Prisma.JsonNull,
    },
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

  await prisma.listing.update({
    where: { id },
    data: { status: statusRaw as ListingStatus },
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

  await prisma.listing.delete({ where: { id } });
  revalidatePath("/listings");
  redirect("/me");
}
