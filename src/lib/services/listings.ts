import "server-only";
import { prisma } from "@/lib/prisma";
import { getCategoryMargin, computeListingPricing } from "@/lib/pricing";
import { Prisma } from "@/generated/prisma/client";
import type {
  ListingType,
  TradeKind,
  ListingStatus,
  ListingCondition,
  ListingCloseReason,
  ItemKind,
} from "@/generated/prisma/client";

/**
 * Product/Equipment classification (src/lib/taxonomy.ts), already validated by the
 * caller. Mutually exclusive with itself: itemKind picks which tree; a null itemKind
 * means an untagged listing or a service, and category/subcategory are null too.
 */
export type ListingClassification = {
  itemKind: ItemKind | null;
  categorySlug: string | null;
  subcategorySlug: string | null;
};

/**
 * Listing SERVICE (PRD §3 + §7B). Framework-agnostic: no FormData/redirect/
 * revalidate/cookies. Owns pricing assembly (the category-margin -> buyer-price
 * math) and persistence. FORM PARSING, MEDIA SAVING, and AUTHORIZATION (owner /
 * canManageListing) stay in the caller, because the web upload ordering must
 * validate before persisting files (same split as verification). A mobile create-
 * listing endpoint uploads media separately and passes the resulting URLs. See
 * docs/CX-build-checklist.md section E.
 */

/** Common listing fields, already parsed + validated by the caller. */
export type ListingCommon = {
  title: string;
  tradeCategory: string;
  city: string;
  state: string;
  lat: number | null;
  lng: number | null;
  description: string;
  unit: string;
  freightNote: string;
  condition: ListingCondition | null;
  manufacturer: string;
};

/** The type-exclusive fields (PRD §10 constraint), already parsed by the caller. */
export type ListingTypeFields = {
  type: ListingType;
  tradeKind: TradeKind | null;
  price: number | null;
  startReserve: number | null;
  closesAt: Date | null;
  // Set-price inputs (PRD §7B): the seller's private net + whether offers are allowed.
  sellerNet?: number;
  acceptsOffers?: boolean;
};

type PricingData = {
  price: number | null;
  sellerNet: number | null;
  marginPct: number | null;
  acceptsOffers: boolean;
  listedAt: Date | null;
};

/**
 * Margin pricing per listing type. Set-price: the seller enters their NET and the
 * public price = net x (1 + category margin). Open-for-bid mirrors this: the reserve
 * IS the seller's net floor, so the public opening bid = reserve x (1 + margin); we
 * store that in `price` (what buyers see) and keep `startReserve` as the private net.
 * Trades carry no pricing.
 */
async function pricingData(
  tf: ListingTypeFields,
  category: string,
): Promise<PricingData> {
  if (tf.type === "price" && tf.sellerNet !== undefined) {
    const marginPct = await getCategoryMargin(category);
    const p = computeListingPricing(tf.sellerNet, marginPct, new Date());
    return {
      price: p.price,
      sellerNet: p.sellerNet,
      marginPct: p.marginPct,
      acceptsOffers: tf.acceptsOffers ?? true,
      listedAt: p.listedAt,
    };
  }
  if (tf.type === "bid" && tf.startReserve !== null) {
    const marginPct = await getCategoryMargin(category);
    // Reserve is the seller's net floor; buyers bid the gross (net + margin).
    const opening = computeListingPricing(tf.startReserve, marginPct, new Date());
    return {
      price: opening.price,
      sellerNet: null,
      marginPct,
      acceptsOffers: false,
      listedAt: null,
    };
  }
  return {
    price: tf.price,
    sellerNet: null,
    marginPct: null,
    acceptsOffers: false,
    listedAt: null,
  };
}

export type CreateListingParams = {
  owner: { type: "user" | "company"; id: string };
  common: ListingCommon;
  typeFields: ListingTypeFields;
  classification: ListingClassification;
  quantity: number;
  /** Already-saved media URLs (the caller persists uploads). */
  photos: string[];
};

/** Create a listing (buyer price computed from the category margin for set-price). */
export async function createListing(
  params: CreateListingParams,
): Promise<{ listingId: string }> {
  const { common: c, typeFields: tf, classification: cls, owner, photos, quantity } = params;
  const pricing = await pricingData(tf, c.tradeCategory);

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
    condition: c.condition,
    manufacturer: c.manufacturer || null,
    photos: photos.length > 0 ? photos : undefined,
    itemKind: cls.itemKind,
    categorySlug: cls.itemKind ? cls.categorySlug : null,
    subcategorySlug: cls.itemKind ? cls.subcategorySlug : null,
    type: tf.type,
    tradeKind: tf.tradeKind,
    price: pricing.price,
    sellerNet: pricing.sellerNet,
    marginPct: pricing.marginPct,
    acceptsOffers: pricing.acceptsOffers,
    listedAt: pricing.listedAt,
    quantityAvailable: quantity,
    startReserve: tf.startReserve,
    closesAt: tf.closesAt,
    ...(owner.type === "company"
      ? { ownerCompany: { connect: { id: owner.id } } }
      : { ownerUser: { connect: { id: owner.id } } }),
  };

  const listing = await prisma.listing.create({ data });
  return { listingId: listing.id };
}

export type UpdateListingParams = {
  listingId: string;
  common: ListingCommon;
  typeFields: ListingTypeFields;
  classification: ListingClassification;
  quantity: number;
  status: ListingStatus;
  /** Final media set: kept existing URLs + newly uploaded, in order. */
  photos: string[];
};

/** Edit a listing's fields, pricing, status, and media. */
export async function updateListing(params: UpdateListingParams): Promise<void> {
  const { listingId, common: c, typeFields: tf, classification: cls, quantity, status, photos } = params;
  const pricing = await pricingData(tf, c.tradeCategory);

  await prisma.listing.update({
    where: { id: listingId },
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
      condition: c.condition,
      manufacturer: c.manufacturer || null,
      itemKind: cls.itemKind,
      categorySlug: cls.itemKind ? cls.categorySlug : null,
      subcategorySlug: cls.itemKind ? cls.subcategorySlug : null,
      type: tf.type,
      tradeKind: tf.tradeKind,
      price: pricing.price,
      sellerNet: pricing.sellerNet,
      marginPct: pricing.marginPct,
      acceptsOffers: pricing.acceptsOffers,
      listedAt: pricing.listedAt,
      quantityAvailable: quantity,
      startReserve: tf.startReserve,
      closesAt: tf.closesAt,
      status,
      photos: photos.length > 0 ? photos : Prisma.JsonNull,
    },
  });
}

export type UpdateStatusParams = {
  listingId: string;
  status: ListingStatus;
  /** Validated close reason (only applied when status is "closed"). */
  closeReason?: ListingCloseReason | null;
  closeReasonNote?: string | null;
};

/** Change a listing's status; captures/clears the seller close reason. */
export async function updateListingStatus(
  params: UpdateStatusParams,
): Promise<void> {
  const data: Prisma.ListingUpdateInput = { status: params.status };
  // Capture the close reason when closing; clear it on reactivate. (Other
  // statuses, e.g. sold, leave it untouched.)
  if (params.status === "closed") {
    data.closeReason = params.closeReason ?? null;
    data.closeReasonNote = params.closeReasonNote ?? null;
  } else if (params.status === "active") {
    data.closeReason = null;
    data.closeReasonNote = null;
  }
  await prisma.listing.update({ where: { id: params.listingId }, data });
}

/** Permanently delete a listing. */
export async function deleteListing(listingId: string): Promise<void> {
  await prisma.listing.delete({ where: { id: listingId } });
}
