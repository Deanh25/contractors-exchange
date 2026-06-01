import type { Listing, User, Company } from "@/generated/prisma/client";
import { metroLabel } from "@/lib/locations";

/**
 * Shared presentation helpers for listings (PRD §3). The DB stores three types
 * (price | bid | trade); the UI presents four choices by splitting `trade` into
 * goods vs. services via `tradeKind`.
 */

// The four user-facing choices on the create form, in display order.
export type ListingChoice = "price" | "bid" | "trade-goods" | "trade-services";

export const LISTING_CHOICES: {
  value: ListingChoice;
  label: string;
  blurb: string;
  tone: string; // Tailwind classes for the type badge
}[] = [
  {
    value: "price",
    label: "Set price",
    blurb: "Fixed price, buy now.",
    tone: "bg-emerald-100 text-emerald-800",
  },
  {
    value: "bid",
    label: "Open for bid",
    blurb: "Starting bid + close date.",
    tone: "bg-amber-100 text-amber-800",
  },
  {
    value: "trade-goods",
    label: "Trade goods",
    blurb: "Swap equipment & materials.",
    tone: "bg-sky-100 text-sky-800",
  },
  {
    value: "trade-services",
    label: "Trade services",
    blurb: "Exchange work for work.",
    tone: "bg-violet-100 text-violet-800",
  },
];

/** Map a stored (type, tradeKind) pair back to its UI choice. */
export function listingChoice(
  type: string,
  tradeKind: string | null,
): ListingChoice {
  if (type === "price") return "price";
  if (type === "bid") return "bid";
  return tradeKind === "service" ? "trade-services" : "trade-goods";
}

const CHOICE_BY_VALUE = new Map(LISTING_CHOICES.map((c) => [c.value, c]));

/** Badge label + tone for a listing, derived from its type/tradeKind. */
export function listingBadge(type: string, tradeKind: string | null) {
  const choice = CHOICE_BY_VALUE.get(listingChoice(type, tradeKind));
  return { label: choice?.label ?? type, tone: choice?.tone ?? "bg-slate-100 text-slate-700" };
}

const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

/**
 * Format a money column. The MariaDB adapter returns Decimal columns as JS
 * numbers (decimalAsNumber: true), but Prisma's generated type is `Decimal`, so
 * we coerce defensively via Number().
 */
export function formatMoney(value: unknown): string {
  if (value === null || value === undefined) return "";
  const n = Number(value);
  return Number.isFinite(n) ? USD.format(n) : "";
}

/** Read a Listing.photos JSON column into a string[] (media URLs). */
export function photosFromJson(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

const VIDEO_EXTS = new Set(["mp4", "webm", "mov"]);

/** Is this media URL a video (vs an image)? By extension. */
export function isVideoUrl(url: string): boolean {
  const ext = url.split(".").pop()?.toLowerCase();
  return !!ext && VIDEO_EXTS.has(ext);
}

/** A listing with its owner relations included. */
export type ListingWithOwner = Listing & {
  ownerUser: User | null;
  ownerCompany: Company | null;
};

export type ListingOwner = {
  kind: "user" | "company";
  id: string;
  name: string;
  href: string;
  avatarUrl: string | null;
  verified: boolean;
  location: string;
};

/** Resolve the polymorphic owner of a listing into a uniform shape for the UI. */
export function listingOwner(listing: ListingWithOwner): ListingOwner | null {
  if (listing.ownerCompany) {
    const c = listing.ownerCompany;
    return {
      kind: "company",
      id: c.id,
      name: c.name,
      href: `/company/${c.slug}`,
      avatarUrl: c.logoUrl,
      verified: c.verified,
      location: metroLabel(c.city, c.state),
    };
  }
  if (listing.ownerUser) {
    const u = listing.ownerUser;
    return {
      kind: "user",
      id: u.id,
      name: u.name,
      href: `/u/${u.id}`,
      avatarUrl: u.avatarUrl,
      verified: u.verified,
      location: metroLabel(u.city, u.state),
    };
  }
  return null;
}

/** The standard owner include for listing queries. */
export const ownerInclude = { ownerUser: true, ownerCompany: true } as const;
