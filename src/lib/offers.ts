import "server-only";
import { prisma } from "@/lib/prisma";
import type { Party, PartyType } from "@/lib/messaging";

/**
 * Buyer offers / negotiation (PRD §7B, corrected model). A buyer negotiates a
 * set-price listing by proposing a buyer price; the implied seller net is
 * back-calculated at the listing's fixed margin and stored privately on the
 * Offer. Counters alternate buyer/seller; the latest pending offer awaits the
 * OTHER side.
 */

/** The columns encoding the buyer party on an Offer. */
export function offerBuyerColumns(buyer: Party) {
  return {
    buyerType: buyer.type,
    buyerUserId: buyer.type === "user" ? buyer.id : null,
    buyerCompanyId: buyer.type === "company" ? buyer.id : null,
  };
}

type OfferSides = {
  buyerType: PartyType;
  buyerUserId: string | null;
  buyerCompanyId: string | null;
};

/** Extract the buyer party from an Offer row. */
export function offerBuyerParty(o: OfferSides): Party {
  return o.buyerType === "company"
    ? { type: "company", id: o.buyerCompanyId! }
    : { type: "user", id: o.buyerUserId! };
}

/** Prisma where-fragment: this party is the buyer on the offer. */
export function offerBuyerWhere(buyer: Party) {
  return buyer.type === "company"
    ? { buyerCompanyId: buyer.id }
    : { buyerUserId: buyer.id };
}

/** The latest still-open (pending) offer in a (listing, buyer) negotiation. */
export async function getActiveOffer(listingId: string, buyer: Party) {
  return prisma.offer.findFirst({
    where: { listingId, ...offerBuyerWhere(buyer), status: "pending" },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Given the latest pending offer and which party the viewer controls, is it the
 * viewer's turn to respond? The responder is the side OPPOSITE the one who made
 * the offer.
 */
export function viewerCanRespond(
  fromSide: "buyer" | "seller",
  viewerIsSeller: boolean,
): boolean {
  return fromSide === "buyer" ? viewerIsSeller : !viewerIsSeller;
}
