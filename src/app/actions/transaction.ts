"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { findOrCreateThread, resolveListingRecipient } from "@/lib/messaging";
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

/**
 * Confirm a deal from the checkout/review step: purchase / bid / trade-request.
 * Creates the record (stubbed - no money), opens a side-channel thread + posts an
 * auto-message that notifies the seller, then lands on the ORDER page (checkout
 * feel), NOT the message thread. De-dupes an existing active deal for the buyer.
 */
export async function createTransactionAction(formData: FormData) {
  const user = await requireUser("/listings");
  const listingId = String(formData.get("listingId") ?? "");
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) redirect("/listings");

  const sellerId = await resolveListingRecipient(listing);
  if (!sellerId || sellerId === user.id) redirect(`/listings/${listingId}`);

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

  const thread = await findOrCreateThread(user.id, sellerId, listingId);

  // One active deal per (listing, buyer): reuse it instead of duplicating.
  const existing = await prisma.transaction.findFirst({
    where: {
      listingId,
      buyerId: user.id,
      status: { in: ["pending", "accepted"] },
    },
  });
  let txId: string;
  if (existing) {
    txId = existing.id;
  } else {
    const created = await prisma.transaction.create({
      data: { listingId, buyerId: user.id, sellerId, type, amount, message },
    });
    txId = created.id;
    await prisma.message.create({
      data: {
        threadId: thread.id,
        senderId: user.id,
        body: txCreatedMessage(type, amount, listing.title),
      },
    });
    await prisma.thread.update({
      where: { id: thread.id },
      data: { updatedAt: new Date() },
    });
    // Alert the seller that a new deal landed.
    await createNotification({
      userId: sellerId,
      actorId: user.id,
      type: "order_new",
      title: `${user.name} started a deal`,
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

  const isSeller = tx.sellerId === user.id;
  const isBuyer = tx.buyerId === user.id;
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

  // Reflect the change in the conversation thread.
  const thread = await findOrCreateThread(tx.buyerId, tx.sellerId, tx.listingId);
  await prisma.message.create({
    data: {
      threadId: thread.id,
      senderId: user.id,
      body: txStatusMessage(next, user.name),
    },
  });
  await prisma.thread.update({
    where: { id: thread.id },
    data: { updatedAt: new Date() },
  });

  // Notify the other party of the status change.
  const otherPartyId = isSeller ? tx.buyerId : tx.sellerId;
  await createNotification({
    userId: otherPartyId,
    actorId: user.id,
    type: "order_update",
    title: txStatusMessage(next, user.name),
    body: tx.listing.title,
    href: `/orders/${txId}`,
    listingId: tx.listingId,
    transactionId: txId,
  });

  revalidatePath(`/messages/${thread.id}`);
  revalidatePath("/orders");
  redirect(back);
}
