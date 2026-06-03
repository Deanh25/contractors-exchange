import "server-only";
import { prisma } from "@/lib/prisma";
import type { PriceAgreement } from "@/generated/prisma/client";

/**
 * Spread/margin pricing (PRD §7B). A seller enters a private NET; CX adds a
 * per-category margin to form the public buyer price. Only the buyer price is
 * ever public; sellerNet / marginPct stay private (owner + admin only).
 */

export type MarginBand = { defaultPct: number; minPct: number; maxPct: number };

/** Fallback band when a category has no configured CategoryMargin row. */
export const DEFAULT_BAND: MarginBand = { defaultPct: 12, minPct: 6, maxPct: 25 };

export async function getMarginBand(category: string): Promise<MarginBand> {
  const row = await prisma.categoryMargin.findUnique({ where: { category } });
  return row
    ? { defaultPct: row.defaultPct, minPct: row.minPct, maxPct: row.maxPct }
    : DEFAULT_BAND;
}

/** Public buyer price for a seller net at a given margin %, rounded to cents. */
export function buyerPriceFor(sellerNet: number, marginPct: number): number {
  return Math.round(sellerNet * (1 + marginPct / 100) * 100) / 100;
}

/** The margin % implied by a chosen buyer price over a seller net. */
export function impliedMarginPct(sellerNet: number, buyerPrice: number): number {
  if (sellerNet <= 0) return 0;
  return (buyerPrice / sellerNet - 1) * 100;
}

/** The CX margin amount (spread) on a set-price listing, or null. */
export function marginAmount(listing: {
  price: unknown;
  sellerNet: unknown;
}): number | null {
  if (listing.price == null || listing.sellerNet == null) return null;
  return Number(listing.price) - Number(listing.sellerNet);
}

export type ComputedPricing = {
  price: number; // public buyer price
  sellerNet: number; // private
  marginPct: number; // private
  agreement: PriceAgreement;
  counterReason: string | null;
  listedAt: Date | null;
};

/**
 * Resolve a set-price listing's pricing. Default: buyer price = net + default
 * margin (auto-agreed). Counter: the seller sets a custom buyer price - if its
 * implied margin is within [minPct, maxPct] it auto-agrees, otherwise it is held
 * for admin review (pending_admin, not public).
 */
export function computePricing(
  band: MarginBand,
  sellerNet: number,
  customPrice: number | null,
  counterReason: string | null,
  now: Date,
): ComputedPricing {
  const defaultPrice = buyerPriceFor(sellerNet, band.defaultPct);
  if (customPrice != null && Math.abs(customPrice - defaultPrice) > 0.005) {
    const pct = impliedMarginPct(sellerNet, customPrice);
    const inBand = pct >= band.minPct && pct <= band.maxPct;
    return {
      price: customPrice,
      sellerNet,
      marginPct: Math.round(pct * 100) / 100,
      agreement: inBand ? "agreed" : "pending_admin",
      counterReason: inBand ? null : counterReason,
      listedAt: inBand ? now : null,
    };
  }
  return {
    price: defaultPrice,
    sellerNet,
    marginPct: band.defaultPct,
    agreement: "agreed",
    counterReason: null,
    listedAt: now,
  };
}
