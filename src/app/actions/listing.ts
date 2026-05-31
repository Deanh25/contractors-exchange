"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { saveImages } from "@/lib/storage";
import { TRADES } from "@/lib/trades";
import { parseCoord } from "@/lib/form";
import type {
  ListingType,
  TradeKind,
  Prisma,
} from "@/generated/prisma/client";
import type { ListingChoice } from "@/lib/listings";

const TRADE_SLUGS = new Set(TRADES.map((t) => t.slug));
const CHOICES = new Set<ListingChoice>([
  "price",
  "bid",
  "trade-goods",
  "trade-services",
]);

function fail(code: string): never {
  redirect(`/listings/new?error=${code}`);
}

/** Parse a money input ("1,250.00", "$1250") into a positive number, or null. */
function parseMoney(raw: string): number | null {
  const cleaned = raw.replace(/[^0-9.]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function createListingAction(formData: FormData) {
  const user = await requireUser("/listings/new");

  const title = String(formData.get("title") ?? "").trim();
  const tradeCategory = String(formData.get("tradeCategory") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const state = String(formData.get("state") ?? "").trim();
  const lat = parseCoord(formData.get("lat"));
  const lng = parseCoord(formData.get("lng"));
  const description = String(formData.get("description") ?? "").trim();
  const unit = String(formData.get("unit") ?? "").trim();
  const freightNote = String(formData.get("freightNote") ?? "").trim();
  const owner = String(formData.get("owner") ?? "self");
  const choice = String(formData.get("type") ?? "") as ListingChoice;

  // -- Required-field validation --------------------------------------------
  if (!title) fail("title");
  if (!TRADE_SLUGS.has(tradeCategory)) fail("trade");
  if (!CHOICES.has(choice)) fail("type");

  // -- Resolve the polymorphic owner (self, or a company the user owns) -------
  let ownerUserId: string | null = null;
  let ownerCompanyId: string | null = null;
  if (owner === "self") {
    ownerUserId = user.id;
  } else {
    const membership = await prisma.membership.findUnique({
      where: { userId_companyId: { userId: user.id, companyId: owner } },
    });
    // PRD §2: only a company owner can list on its behalf.
    if (!membership || membership.role !== "owner") fail("owner");
    ownerCompanyId = owner;
  }

  // -- Resolve type-exclusive fields (PRD §10 constraint) ---------------------
  let type: ListingType;
  let tradeKind: TradeKind | null = null;
  let price: number | null = null;
  let startReserve: number | null = null;
  let closesAt: Date | null = null;

  if (choice === "price") {
    type = "price";
    price = parseMoney(String(formData.get("price") ?? ""));
    if (price === null) fail("price");
  } else if (choice === "bid") {
    type = "bid";
    startReserve = parseMoney(String(formData.get("startReserve") ?? ""));
    if (startReserve === null) fail("reserve");
    const closesRaw = String(formData.get("closesAt") ?? "").trim();
    const parsed = closesRaw ? new Date(closesRaw) : null;
    if (!parsed || Number.isNaN(parsed.getTime())) fail("closes");
    closesAt = parsed;
  } else {
    type = "trade";
    tradeKind = choice === "trade-services" ? "service" : "goods";
  }

  // -- Photos → local filesystem (abstracted in src/lib/storage.ts) -----------
  const files = formData
    .getAll("photos")
    .filter((f): f is File => f instanceof File && f.size > 0);
  const photos = await saveImages(files);

  const data: Prisma.ListingCreateInput = {
    title,
    tradeCategory,
    city: city || null,
    state: state || null,
    lat,
    lng,
    description: description || null,
    unit: unit || null,
    freightNote: freightNote || null,
    photos: photos.length > 0 ? photos : undefined,
    type,
    tradeKind,
    price,
    startReserve,
    closesAt,
    ...(ownerCompanyId
      ? { ownerCompany: { connect: { id: ownerCompanyId } } }
      : { ownerUser: { connect: { id: ownerUserId! } } }),
  };

  const listing = await prisma.listing.create({ data });

  revalidatePath("/listings");
  redirect(`/listings/${listing.id}`);
}
