"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import {
  findOrCreateThread,
  listingOwnerParty,
  controlsParty,
  partiesEqual,
  type Party,
} from "@/lib/messaging";
import { getActingContext, getActingCompanies } from "@/lib/identity";
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

function parseMoney(raw: string): number | null {
  const cleaned = raw.replace(/[^0-9.]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function actingParty(userId: string): Promise<Party> {
  const ctx = await getActingContext(userId);
  return ctx.type === "company"
    ? { type: "company", id: ctx.company.id }
    : { type: "user", id: userId };
}

async function actingCompanyIdSet(userId: string): Promise<Set<string>> {
  return new Set((await getActingCompanies(userId)).map((c) => c.id));
}

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

export async function makeOfferAction(formData: FormData) {
  const user = await requireUser("/listings");
  const listingId = String(formData.get("listingId") ?? "");
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) redirect("/listings");
  // Only negotiable set-price listings with resolved pricing.
  if (
    listing.type !== "price" ||
    !listing.acceptsOffers ||
    listing.sellerNet === null ||
    listing.marginPct === null
  ) {
    redirect(`/listings/${listingId}`);
  }

  const seller = listingOwnerParty(listing);
  const buyer = await actingParty(user.id);
  const acting = await actingCompanyIdSet(user.id);
  if (!seller || partiesEqual(buyer, seller) || controlsParty(seller, user.id, acting)) {
    redirect(`/listings/${listingId}`);
  }

  const thread = await findOrCreateThread(buyer, seller, listingId);
  // A negotiation is already open: take them to it instead of stacking offers.
  if (await getActiveOffer(listingId, buyer)) {
    redirect(`/messages/${thread.id}`);
  }

  const buyerPrice = parseMoney(String(formData.get("buyerPrice") ?? ""));
  if (buyerPrice === null) redirect(`/listings/${listingId}?error=offer`);
  const marginPct = listing.marginPct;
  const sellerNet = impliedNet(buyerPrice, marginPct);
  const message = String(formData.get("message") ?? "").trim() || null;

  await prisma.offer.create({
    data: {
      listingId,
      ...offerBuyerColumns(buyer),
      fromSide: "buyer",
      buyerPrice,
      sellerNet,
      marginPct,
      message,
      threadId: thread.id,
    },
  });

  const buyerName = await partyName(buyer, user.name);
  await postThreadMessage(
    thread.id,
    user.id,
    buyer,
    `Offered ${formatMoney(buyerPrice)} for "${listing.title}".${message ? ` ${message}` : ""}`,
  );
  await notifyOffer(
    seller,
    buyer,
    user.id,
    "offer_new",
    `${buyerName} made an offer`,
    `${formatMoney(buyerPrice)} for "${listing.title}"`,
    thread.id,
    listingId,
  );

  revalidatePath(`/messages/${thread.id}`);
  redirect(`/messages/${thread.id}`);
}

// --- Either side: respond (accept / decline / counter) -----------------------

export async function respondOfferAction(formData: FormData) {
  const user = await requireUser("/messages");
  const offerId = String(formData.get("offerId") ?? "");
  const op = String(formData.get("op") ?? "");

  const offer = await prisma.offer.findUnique({
    where: { id: offerId },
    include: { listing: true },
  });
  if (!offer || offer.status !== "pending") redirect("/messages");

  const listing = offer.listing;
  const seller = listingOwnerParty(listing);
  const buyer = offerBuyerParty(offer);
  if (!seller) redirect("/messages");

  const acting = await actingCompanyIdSet(user.id);
  const isSeller = controlsParty(seller, user.id, acting);
  const isBuyer = controlsParty(buyer, user.id, acting);
  const threadId =
    offer.threadId ?? (await findOrCreateThread(buyer, seller, listing.id)).id;
  const back = `/messages/${threadId}`;

  // Only the side opposite the one who made this offer may respond.
  if (!viewerCanRespond(offer.fromSide, isSeller) || (!isSeller && !isBuyer)) {
    redirect(back);
  }
  const actor: Party = isSeller ? seller : buyer;
  const other: Party = isSeller ? buyer : seller;
  const actorName = await partyName(actor, user.name);

  if (op === "accept") {
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
      user.id,
      actor,
      `Accepted the offer at ${formatMoney(buyerPrice)}. Deal started.`,
    );
    await notifyOffer(
      other,
      actor,
      user.id,
      "offer_update",
      `${actorName} accepted the offer`,
      `${formatMoney(buyerPrice)} for "${listing.title}"`,
      threadId,
      listing.id,
      tx.id,
    );
    revalidatePath(`/messages/${threadId}`);
    revalidatePath("/orders");
    redirect(`/orders/${tx.id}`);
  }

  if (op === "decline") {
    await prisma.offer.update({
      where: { id: offer.id },
      data: { status: "declined" },
    });
    await postThreadMessage(threadId, user.id, actor, "Declined the offer.");
    await notifyOffer(
      other,
      actor,
      user.id,
      "offer_update",
      `${actorName} declined your offer`,
      `For "${listing.title}"`,
      threadId,
      listing.id,
    );
    redirect(back);
  }

  if (op === "counter") {
    const counterPrice = parseMoney(String(formData.get("buyerPrice") ?? ""));
    if (counterPrice === null) redirect(back);
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
      user.id,
      actor,
      `Countered at ${formatMoney(counterPrice)}.`,
    );
    await notifyOffer(
      other,
      actor,
      user.id,
      "offer_update",
      `${actorName} countered`,
      `${formatMoney(counterPrice)} for "${listing.title}"`,
      threadId,
      listing.id,
    );
    redirect(back);
  }

  redirect(back);
}
