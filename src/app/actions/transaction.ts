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
import {
  txPartyColumns,
  txParties,
  buyerWhere,
} from "@/lib/orders";
import {
  txTypeForListing,
  txCreatedMessage,
  txStatusMessage,
} from "@/lib/transactions";
import { createNotification } from "@/lib/notifications";
import type { TransactionStatus } from "@/generated/prisma/client";

/** Safe same-origin return path. */
function safeBack(value: FormDataEntryValue | null, fallback: string): string {
  const v = typeof value === "string" ? value : "";
  return v.startsWith("/") && !v.startsWith("//") ? v : fallback;
}

/** The party the user is currently acting as. */
async function actingParty(userId: string): Promise<Party> {
  const ctx = await getActingContext(userId);
  return ctx.type === "company"
    ? { type: "company", id: ctx.company.id }
    : { type: "user", id: userId };
}

async function actingCompanyIdSet(userId: string): Promise<Set<string>> {
  const cs = await getActingCompanies(userId);
  return new Set(cs.map((c) => c.id));
}

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

/** Notify a party of an order event (a user, or a company's permitted team). */
async function notifyParty(
  recipient: Party,
  n: {
    actorId: string;
    type: "order_new" | "order_update";
    title: string;
    body: string | null;
    href: string;
    listingId: string | null;
    transactionId: string;
  },
): Promise<void> {
  const payload = {
    actorId: n.actorId,
    type: n.type,
    title: n.title,
    body: n.body,
    href: n.href,
    listingId: n.listingId,
    transactionId: n.transactionId,
  };
  if (recipient.type === "user") {
    await createNotification({ userId: recipient.id, ...payload });
    return;
  }
  const members = await prisma.membership.findMany({
    where: {
      companyId: recipient.id,
      OR: [{ role: "owner" }, { canActAsCompany: true }],
    },
    select: { userId: true },
  });
  for (const m of members) {
    await createNotification({ userId: m.userId, ...payload });
  }
}

/**
 * Confirm a deal from the checkout step. The BUYER is the current acting
 * identity (you, or a company you act for); the SELLER is the listing's owning
 * party. So a personal listing never routes through a company, and each company
 * transacts for its own products. Lands on the order page (checkout feel).
 */
export async function createTransactionAction(formData: FormData) {
  const user = await requireUser("/listings");
  const listingId = String(formData.get("listingId") ?? "");
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) redirect("/listings");

  const seller = listingOwnerParty(listing);
  const buyer = await actingParty(user.id);
  const acting = await actingCompanyIdSet(user.id);
  // Can't buy with no seller, your own identity, or a listing you control.
  if (
    !seller ||
    partiesEqual(buyer, seller) ||
    controlsParty(seller, user.id, acting)
  ) {
    redirect(`/listings/${listingId}`);
  }

  const type = txTypeForListing(listing.type);
  let amount: number | null = null;
  if (type === "purchase") {
    amount = listing.price === null ? null : Number(listing.price);
  } else if (type === "bid") {
    const raw = String(formData.get("amount") ?? "").replace(/[^0-9.]/g, "");
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) redirect(`/checkout/${listingId}?error=bid`);
    amount = n;
  }
  const message = String(formData.get("message") ?? "").trim() || null;

  // Deal thread = buyer party <-> seller party (aligns with messaging).
  const thread = await findOrCreateThread(buyer, seller, listingId);

  // One active deal per (listing, buyer party): reuse it instead of duplicating.
  const existing = await prisma.transaction.findFirst({
    where: {
      listingId,
      ...buyerWhere(buyer),
      status: { in: ["pending", "accepted"] },
    },
  });
  let txId: string;
  if (existing) {
    txId = existing.id;
  } else {
    const created = await prisma.transaction.create({
      data: {
        listingId,
        ...txPartyColumns(buyer, seller),
        type,
        amount,
        buyerPrice: amount, // §7B: public price (spread flow lands later)
        message,
      },
    });
    txId = created.id;
    await prisma.message.create({
      data: {
        threadId: thread.id,
        senderUserId: user.id,
        senderCompanyId: buyer.type === "company" ? buyer.id : null,
        body: txCreatedMessage(type, amount, listing.title),
      },
    });
    await prisma.thread.update({
      where: { id: thread.id },
      data: { updatedAt: new Date() },
    });
    const buyerName = await partyName(buyer, user.name);
    await notifyParty(seller, {
      actorId: user.id,
      type: "order_new",
      title: `${buyerName} started a deal`,
      body: txCreatedMessage(type, amount, listing.title),
      href: `/orders/${txId}`,
      listingId,
      transactionId: txId,
    });
  }

  revalidatePath("/orders");
  redirect(`/orders/${txId}`);
}

/** Advance a deal: accept / decline (seller), complete (either), cancel (buyer). */
export async function updateTransactionAction(formData: FormData) {
  const user = await requireUser("/orders");
  const txId = String(formData.get("transactionId") ?? "");
  const op = String(formData.get("op") ?? "");

  const tx = await prisma.transaction.findUnique({
    where: { id: txId },
    include: { listing: true },
  });
  if (!tx) redirect("/orders");

  const { buyer, seller } = txParties(tx);
  const acting = await actingCompanyIdSet(user.id);
  const isSeller = controlsParty(seller, user.id, acting);
  const isBuyer = controlsParty(buyer, user.id, acting);
  if (!isSeller && !isBuyer) redirect("/orders");

  let next: TransactionStatus | null = null;
  if (op === "accept" && isSeller && tx.status === "pending") next = "accepted";
  else if (op === "decline" && isSeller && tx.status === "pending") next = "declined";
  else if (op === "complete" && tx.status === "accepted") next = "completed";
  else if (op === "cancel" && isBuyer && tx.status === "pending") next = "cancelled";

  const back = safeBack(formData.get("back"), "/orders");
  if (!next) redirect(back); // invalid transition - just go back

  await prisma.transaction.update({
    where: { id: txId },
    data: { status: next },
  });

  // The acting side (the one the user controls) authors the status message.
  const actingSide: Party = isSeller ? seller : buyer;
  const other: Party = isSeller ? buyer : seller;
  const actorName = await partyName(actingSide, user.name);

  // Reflect the change in the conversation thread (buyer <-> seller party).
  const thread = await findOrCreateThread(buyer, seller, tx.listingId);
  await prisma.message.create({
    data: {
      threadId: thread.id,
      senderUserId: user.id,
      senderCompanyId: actingSide.type === "company" ? actingSide.id : null,
      body: txStatusMessage(next, actorName),
    },
  });
  await prisma.thread.update({
    where: { id: thread.id },
    data: { updatedAt: new Date() },
  });

  await notifyParty(other, {
    actorId: user.id,
    type: "order_update",
    title: txStatusMessage(next, actorName),
    body: tx.listing.title,
    href: `/orders/${txId}`,
    listingId: tx.listingId,
    transactionId: txId,
  });

  revalidatePath(`/messages/${thread.id}`);
  revalidatePath("/orders");
  redirect(back);
}
