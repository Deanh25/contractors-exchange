import "server-only";
import { prisma } from "@/lib/prisma";
import {
  findOrCreateThread,
  listingOwnerParty,
  controlsParty,
  partiesEqual,
  type Party,
} from "@/lib/messaging";
import { txPartyColumns } from "@/lib/orders";
import { createNotification } from "@/lib/notifications";
import { impliedNet } from "@/lib/pricing";
import { formatMoney } from "@/lib/listings";
import {
  offerBuyerColumns,
  offerBuyerParty,
  getActiveOffer,
  viewerCanRespond,
} from "@/lib/offers";
import type { OfferSide, NotificationType } from "@/generated/prisma/client";

/**
 * Buyer-offer / negotiation SERVICE (PRD §7B). Framework-agnostic domain logic:
 * no FormData, no redirect/revalidate, no cookies. The caller (a Server Action
 * today, a mobile API endpoint later) resolves WHO is acting -- userId, the
 * acting-as party, and the set of companies the user controls -- from its own
 * transport, then hands that in as an `Actor`. The service returns a typed result
 * the caller maps to a redirect (web) or a JSON response (mobile). See
 * docs/CX-build-checklist.md section E for the house pattern.
 */

/** The resolved identity making the call. Built by the caller from cookies (web)
 * or a bearer token (mobile) -- never read inside the service. */
export type Actor = {
  userId: string;
  userName: string;
  /** The party the user is acting as (self or a company). */
  party: Party;
  /** Ids of every company the user may act for (for controlsParty checks). */
  actingCompanyIds: Set<string>;
};

export type MakeOfferInput = {
  listingId: string;
  /** Raw user input; parsed + validated here so web and mobile share the rule. */
  buyerPrice: string;
  message?: string | null;
};

export type MakeOfferResult =
  | { status: "created"; threadId: string }
  | { status: "existing"; threadId: string }
  | {
      status: "error";
      code: "no_listing" | "not_negotiable" | "forbidden" | "bad_price";
    };

export type RespondOfferInput = {
  offerId: string;
  op: "accept" | "decline" | "counter";
  /** Raw counter price, required when op === "counter". */
  counterPrice?: string;
};

export type RespondOfferResult =
  | { status: "accepted"; threadId: string; transactionId: string }
  | { status: "declined"; threadId: string }
  | { status: "countered"; threadId: string }
  | { status: "noop"; threadId: string }
  | { status: "error"; code: "no_offer" };

/** Parse a money input ("1,250.00", "$1250") into a positive number, or null. */
function parseMoney(raw: string): number | null {
  const cleaned = raw.replace(/[^0-9.]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** A company party's display name (users fall back to the actor's own name). */
async function partyName(party: Party, fallback: string): Promise<string> {
  if (party.type === "company") {
    const co = await prisma.company.findUnique({
      where: { id: party.id },
      select: { name: true },
    });
    return co?.name ?? fallback;
  }
  return fallback;
}

/** Post a system-style message into the negotiation thread, authored by the actor. */
async function postThreadMessage(
  threadId: string,
  userId: string,
  actor: Party,
  body: string,
) {
  await prisma.message.create({
    data: {
      threadId,
      senderUserId: userId,
      senderCompanyId: actor.type === "company" ? actor.id : null,
      body,
    },
  });
  await prisma.thread.update({
    where: { id: threadId },
    data: { updatedAt: new Date() },
  });
}

async function notifyOffer(
  recipient: Party,
  actor: Party,
  userId: string,
  type: Extract<NotificationType, "offer_new" | "offer_update">,
  title: string,
  body: string,
  threadId: string,
  listingId: string,
  transactionId: string | null = null,
) {
  await createNotification({
    recipient,
    type,
    actorUserId: userId,
    actorCompanyId: actor.type === "company" ? actor.id : null,
    title,
    body,
    href: transactionId ? `/orders/${transactionId}` : `/messages/${threadId}`,
    threadId,
    listingId,
    transactionId,
  });
}

// --- Buyer: make an offer ----------------------------------------------------

export async function makeOffer(
  actor: Actor,
  input: MakeOfferInput,
): Promise<MakeOfferResult> {
  const listing = await prisma.listing.findUnique({
    where: { id: input.listingId },
  });
  if (!listing) return { status: "error", code: "no_listing" };

  // Only negotiable set-price listings with resolved pricing.
  if (
    listing.type !== "price" ||
    !listing.acceptsOffers ||
    listing.sellerNet === null ||
    listing.marginPct === null
  ) {
    return { status: "error", code: "not_negotiable" };
  }

  const seller = listingOwnerParty(listing);
  const buyer = actor.party;
  if (
    !seller ||
    partiesEqual(buyer, seller) ||
    controlsParty(seller, actor.userId, actor.actingCompanyIds)
  ) {
    return { status: "error", code: "forbidden" };
  }

  const thread = await findOrCreateThread(buyer, seller, listing.id);
  // A negotiation is already open: send them to it instead of stacking offers.
  if (await getActiveOffer(listing.id, buyer)) {
    return { status: "existing", threadId: thread.id };
  }

  const buyerPrice = parseMoney(input.buyerPrice);
  if (buyerPrice === null) return { status: "error", code: "bad_price" };
  const marginPct = listing.marginPct;
  const sellerNet = impliedNet(buyerPrice, marginPct);
  const message = (input.message ?? "").trim() || null;

  await prisma.offer.create({
    data: {
      listingId: listing.id,
      ...offerBuyerColumns(buyer),
      fromSide: "buyer",
      buyerPrice,
      sellerNet,
      marginPct,
      message,
      threadId: thread.id,
    },
  });

  const buyerName = await partyName(buyer, actor.userName);
  await postThreadMessage(
    thread.id,
    actor.userId,
    buyer,
    `Offered ${formatMoney(buyerPrice)} for "${listing.title}".${message ? ` ${message}` : ""}`,
  );
  await notifyOffer(
    seller,
    buyer,
    actor.userId,
    "offer_new",
    `${buyerName} made an offer`,
    `${formatMoney(buyerPrice)} for "${listing.title}"`,
    thread.id,
    listing.id,
  );

  return { status: "created", threadId: thread.id };
}

// --- Either side: respond (accept / decline / counter) -----------------------

export async function respondToOffer(
  actor: Actor,
  input: RespondOfferInput,
): Promise<RespondOfferResult> {
  const offer = await prisma.offer.findUnique({
    where: { id: input.offerId },
    include: { listing: true },
  });
  if (!offer || offer.status !== "pending") {
    return { status: "error", code: "no_offer" };
  }

  const listing = offer.listing;
  const seller = listingOwnerParty(listing);
  const buyer = offerBuyerParty(offer);
  if (!seller) return { status: "error", code: "no_offer" };

  const acting = actor.actingCompanyIds;
  const isSeller = controlsParty(seller, actor.userId, acting);
  const isBuyer = controlsParty(buyer, actor.userId, acting);
  const threadId =
    offer.threadId ?? (await findOrCreateThread(buyer, seller, listing.id)).id;

  // Only the side opposite the one who made this offer may respond.
  if (!viewerCanRespond(offer.fromSide, isSeller) || (!isSeller && !isBuyer)) {
    return { status: "noop", threadId };
  }
  const actorParty: Party = isSeller ? seller : buyer;
  const other: Party = isSeller ? buyer : seller;
  const actorName = await partyName(actorParty, actor.userName);

  if (input.op === "accept") {
    const buyerPrice = Number(offer.buyerPrice);
    const sellerNet = Number(offer.sellerNet);
    const margin = Math.round((buyerPrice - sellerNet) * 100) / 100;
    const tx = await prisma.transaction.create({
      data: {
        listingId: listing.id,
        ...txPartyColumns(buyer, seller),
        type: "purchase",
        amount: buyerPrice,
        buyerPrice,
        sellerNet,
        margin,
        message: `Agreed via offer at ${formatMoney(buyerPrice)}.`,
      },
    });
    await prisma.offer.update({
      where: { id: offer.id },
      data: { status: "accepted" },
    });
    await postThreadMessage(
      threadId,
      actor.userId,
      actorParty,
      `Accepted the offer at ${formatMoney(buyerPrice)}. Deal started.`,
    );
    await notifyOffer(
      other,
      actorParty,
      actor.userId,
      "offer_update",
      `${actorName} accepted the offer`,
      `${formatMoney(buyerPrice)} for "${listing.title}"`,
      threadId,
      listing.id,
      tx.id,
    );
    return { status: "accepted", threadId, transactionId: tx.id };
  }

  if (input.op === "decline") {
    await prisma.offer.update({
      where: { id: offer.id },
      data: { status: "declined" },
    });
    await postThreadMessage(threadId, actor.userId, actorParty, "Declined the offer.");
    await notifyOffer(
      other,
      actorParty,
      actor.userId,
      "offer_update",
      `${actorName} declined your offer`,
      `For "${listing.title}"`,
      threadId,
      listing.id,
    );
    return { status: "declined", threadId };
  }

  if (input.op === "counter") {
    const counterPrice = parseMoney(input.counterPrice ?? "");
    if (counterPrice === null) return { status: "noop", threadId };
    const sellerNet = impliedNet(counterPrice, offer.marginPct);
    const responderSide: OfferSide = isSeller ? "seller" : "buyer";
    await prisma.offer.update({
      where: { id: offer.id },
      data: { status: "countered" },
    });
    await prisma.offer.create({
      data: {
        listingId: listing.id,
        ...offerBuyerColumns(buyer),
        fromSide: responderSide,
        buyerPrice: counterPrice,
        sellerNet,
        marginPct: offer.marginPct,
        parentId: offer.id,
        threadId,
      },
    });
    await postThreadMessage(
      threadId,
      actor.userId,
      actorParty,
      `Countered at ${formatMoney(counterPrice)}.`,
    );
    await notifyOffer(
      other,
      actorParty,
      actor.userId,
      "offer_update",
      `${actorName} countered`,
      `${formatMoney(counterPrice)} for "${listing.title}"`,
      threadId,
      listing.id,
    );
    return { status: "countered", threadId };
  }

  return { status: "noop", threadId };
}
