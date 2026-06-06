import "server-only";
import { prisma } from "@/lib/prisma";
import {
  findOrCreateThread,
  listingOwnerParty,
  controlsParty,
  partiesEqual,
  type Party,
} from "@/lib/messaging";
import { txPartyColumns, txParties, buyerWhere } from "@/lib/orders";
import {
  txTypeForListing,
  txCreatedMessage,
  txStatusMessage,
} from "@/lib/transactions";
import { createNotification } from "@/lib/notifications";
import type { TransactionStatus } from "@/generated/prisma/client";
import type { Actor } from "@/lib/services/actor";

/**
 * Deal / order SERVICE (PRD §7). Framework-agnostic: no FormData, redirect,
 * revalidate, or cookies. The spread (§7B) is realized here -- a set-price buy
 * records the buyer price, the seller's private net, and CX's private margin. The
 * caller hands in a resolved Actor + typed input and maps the typed result to a
 * redirect (web) or JSON (mobile). See docs/CX-build-checklist.md section E.
 */

export type { Actor };

export type CreateDealInput = {
  listingId: string;
  /** Units for a stockable set-price buy (raw; clamped to stock). Ignored otherwise. */
  qty?: string | number | null;
  /** Bid amount (raw) when the listing is a bid. */
  bidAmount?: string | null;
  message?: string | null;
};

export type CreateDealResult =
  | { status: "ok"; transactionId: string }
  | { status: "error"; code: "no_listing" | "forbidden" | "bad_bid" };

export type UpdateDealInput = {
  transactionId: string;
  op: "accept" | "decline" | "complete" | "cancel";
};

export type UpdateDealResult =
  | {
      status: "updated";
      next: TransactionStatus;
      threadId: string;
      listingId: string;
      /** True when a completed set-price sale decremented stock (revalidate listing). */
      stockChanged: boolean;
    }
  | { status: "noop" }
  | { status: "error"; code: "no_tx" | "forbidden" };

/** Display name of a party (company name, or the acting user's name). */
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

/** Notify a recipient party of an order event, from an actor party. */
async function notifyParty(
  recipient: Party,
  actor: Party,
  userId: string,
  n: {
    type: "order_new" | "order_update";
    title: string;
    body: string | null;
    href: string;
    listingId: string | null;
    transactionId: string;
  },
): Promise<void> {
  await createNotification({
    recipient,
    type: n.type,
    actorUserId: userId,
    actorCompanyId: actor.type === "company" ? actor.id : null,
    title: n.title,
    body: n.body,
    href: n.href,
    listingId: n.listingId,
    transactionId: n.transactionId,
  });
}

/**
 * Confirm a deal from checkout. The BUYER is the acting identity; the SELLER is
 * the listing's owning party, so a personal listing never routes through a
 * company and each company transacts for its own products.
 */
export async function createDeal(
  actor: Actor,
  input: CreateDealInput,
): Promise<CreateDealResult> {
  const listing = await prisma.listing.findUnique({
    where: { id: input.listingId },
  });
  if (!listing) return { status: "error", code: "no_listing" };

  const seller = listingOwnerParty(listing);
  const buyer = actor.party;
  // Can't buy with no seller, your own identity, or a listing you control.
  if (
    !seller ||
    partiesEqual(buyer, seller) ||
    controlsParty(seller, actor.userId, actor.actingCompanyIds)
  ) {
    return { status: "error", code: "forbidden" };
  }

  const type = txTypeForListing(listing.type);
  // Quantity for a stockable set-price buy, clamped to available stock.
  const qty =
    type === "purchase"
      ? Math.min(
          Math.max(1, Math.floor(Number(input.qty)) || 1),
          listing.quantityAvailable,
        )
      : 1;
  let amount: number | null = null;
  if (type === "purchase") {
    amount = listing.price === null ? null : Number(listing.price) * qty;
  } else if (type === "bid") {
    const raw = String(input.bidAmount ?? "").replace(/[^0-9.]/g, "");
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return { status: "error", code: "bad_bid" };
    amount = n;
  }
  const message = (input.message ?? "").trim() || null;

  // Spread (§7B): for a set-price buy, the buyer pays `price`, the seller takes
  // their net, and CX keeps the margin. (Bids settle on accept; net TBD.)
  let sellerNet: number | null = null;
  let margin: number | null = null;
  if (type === "purchase" && listing.sellerNet != null && listing.price != null) {
    sellerNet = Number(listing.sellerNet) * qty;
    margin = (Number(listing.price) - Number(listing.sellerNet)) * qty;
  }

  // Deal thread = buyer party <-> seller party (aligns with messaging).
  const thread = await findOrCreateThread(buyer, seller, listing.id);

  // One active deal per (listing, buyer party): reuse it instead of duplicating.
  const existing = await prisma.transaction.findFirst({
    where: {
      listingId: listing.id,
      ...buyerWhere(buyer),
      status: { in: ["pending", "accepted"] },
    },
  });
  if (existing) return { status: "ok", transactionId: existing.id };

  const created = await prisma.transaction.create({
    data: {
      listingId: listing.id,
      ...txPartyColumns(buyer, seller),
      type,
      amount,
      buyerPrice: amount, // §7B: the public price the buyer pays
      sellerNet, // private: what the seller takes home
      margin, // private: CX spread
      quantity: qty, // units bought (decrements stock on completion)
      message,
    },
  });
  await prisma.message.create({
    data: {
      threadId: thread.id,
      senderUserId: actor.userId,
      senderCompanyId: buyer.type === "company" ? buyer.id : null,
      body: txCreatedMessage(type, amount, listing.title),
    },
  });
  await prisma.thread.update({
    where: { id: thread.id },
    data: { updatedAt: new Date() },
  });
  const buyerName = await partyName(buyer, actor.userName);
  await notifyParty(seller, buyer, actor.userId, {
    type: "order_new",
    title: `${buyerName} started a deal`,
    body: txCreatedMessage(type, amount, listing.title),
    href: `/orders/${created.id}`,
    listingId: listing.id,
    transactionId: created.id,
  });

  return { status: "ok", transactionId: created.id };
}

/** Advance a deal: accept / decline (seller), complete (either), cancel (buyer). */
export async function updateDeal(
  actor: Actor,
  input: UpdateDealInput,
): Promise<UpdateDealResult> {
  const tx = await prisma.transaction.findUnique({
    where: { id: input.transactionId },
    include: { listing: true },
  });
  if (!tx) return { status: "error", code: "no_tx" };

  const { buyer, seller } = txParties(tx);
  const acting = actor.actingCompanyIds;
  const isSeller = controlsParty(seller, actor.userId, acting);
  const isBuyer = controlsParty(buyer, actor.userId, acting);
  if (!isSeller && !isBuyer) return { status: "error", code: "forbidden" };

  let next: TransactionStatus | null = null;
  if (input.op === "accept" && isSeller && tx.status === "pending") next = "accepted";
  else if (input.op === "decline" && isSeller && tx.status === "pending") next = "declined";
  else if (input.op === "complete" && tx.status === "accepted") next = "completed";
  else if (input.op === "cancel" && isBuyer && tx.status === "pending") next = "cancelled";

  if (!next) return { status: "noop" }; // invalid transition

  await prisma.transaction.update({
    where: { id: tx.id },
    data: { status: next },
  });

  // On completion of a set-price sale, decrement the listing's stock by the units
  // bought; if it hits zero, mark the listing sold (admin decision §7C #6).
  let stockChanged = false;
  if (next === "completed" && tx.listing.type === "price") {
    const remaining = Math.max(0, tx.listing.quantityAvailable - tx.quantity);
    await prisma.listing.update({
      where: { id: tx.listingId },
      data: {
        quantityAvailable: remaining,
        ...(remaining <= 0 ? { status: "sold" as const } : {}),
      },
    });
    stockChanged = true;
  }

  // The acting side (the one the user controls) authors the status message.
  const actingSide: Party = isSeller ? seller : buyer;
  const other: Party = isSeller ? buyer : seller;
  const actorName = await partyName(actingSide, actor.userName);

  // Reflect the change in the conversation thread (buyer <-> seller party).
  const thread = await findOrCreateThread(buyer, seller, tx.listingId);
  await prisma.message.create({
    data: {
      threadId: thread.id,
      senderUserId: actor.userId,
      senderCompanyId: actingSide.type === "company" ? actingSide.id : null,
      body: txStatusMessage(next, actorName),
    },
  });
  await prisma.thread.update({
    where: { id: thread.id },
    data: { updatedAt: new Date() },
  });

  await notifyParty(other, actingSide, actor.userId, {
    type: "order_update",
    title: txStatusMessage(next, actorName),
    body: tx.listing.title,
    href: `/orders/${tx.id}`,
    listingId: tx.listingId,
    transactionId: tx.id,
  });

  return {
    status: "updated",
    next,
    threadId: thread.id,
    listingId: tx.listingId,
    stockChanged,
  };
}
