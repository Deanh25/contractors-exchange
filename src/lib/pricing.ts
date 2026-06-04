import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Margin pricing (PRD §7B, corrected revenue model). A FLAT, fixed margin % per
 * assignable category (the trade slug). The public buyer price is always
 *   buyerPrice = sellerNet x (1 + marginPct/100)
 * Only the buyer price is public; sellerNet / marginPct stay private (owner +
 * admin only). The margin % never flexes during a sale: buyer negotiation moves
 * the seller's NET, and the buyer price is recomputed at the SAME margin. There
 * is no floor on the net and no per-deal pricing approval.
 */

export const DEFAULT_MARGIN_PCT = 12;

/** The flat margin % for a category (falls back to the code default). */
export async function getCategoryMargin(category: string): Promise<number> {
  const row = await prisma.categoryMargin.findUnique({ where: { category } });
  return row ? row.marginPct : DEFAULT_MARGIN_PCT;
}

/** All configured category margins keyed by category (for the live calculator). */
export async function getAllCategoryMargins(): Promise<Record<string, number>> {
  const rows = await prisma.categoryMargin.findMany();
  const out: Record<string, number> = {};
  for (const r of rows) out[r.category] = r.marginPct;
  return out;
}

/** Public buyer price for a seller net at a given margin %, rounded to cents. */
export function buyerPriceFor(sellerNet: number, marginPct: number): number {
  return Math.round(sellerNet * (1 + marginPct / 100) * 100) / 100;
}

/**
 * Back-calculate the seller net implied by a buyer price at a margin %. Used by
 * the buyer-offer flow: a buyer offers a buyer price, and the seller is shown the
 * net they would take ( net = buyerPrice / (1 + marginPct/100) ).
 */
export function impliedNet(buyerPrice: number, marginPct: number): number {
  return Math.round((buyerPrice / (1 + marginPct / 100)) * 100) / 100;
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
  marginPct: number; // private (the category's flat margin)
  listedAt: Date;
};

/**
 * Pricing for a set-price listing under the flat model: the seller's net plus the
 * category's fixed margin. Always live - no floor, no review.
 */
export function computeListingPricing(
  sellerNet: number,
  marginPct: number,
  now: Date,
): ComputedPricing {
  return {
    price: buyerPriceFor(sellerNet, marginPct),
    sellerNet,
    marginPct,
    listedAt: now,
  };
}
