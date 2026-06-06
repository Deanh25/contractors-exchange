import "server-only";
import { prisma } from "@/lib/prisma";
import {
  findOrCreateThread,
  listingOwnerParty,
  threadParties,
  partiesEqual,
  controlsParty,
  type Party,
} from "@/lib/messaging";
import { createNotification } from "@/lib/notifications";
import type { Actor } from "@/lib/services/actor";

/**
 * Messaging SERVICE (PRD §6 + company-as-actor). Framework-agnostic: no FormData,
 * redirect, revalidate, or cookies. Media is NOT handled here -- the caller saves
 * any upload and passes a resolved `imageUrl` (web saves the File; mobile uploads
 * separately and passes the URL). See docs/CX-build-checklist.md section E.
 */

export type { Actor };

export type OpenThreadResult =
  | { status: "ok"; threadId: string }
  | { status: "error"; code: "no_recipient" | "no_listing" | "forbidden" };

/** Open (or start) a thread between the actor's party and a recipient party. */
export async function startPartyThread(
  actor: Actor,
  recipient: Party | null,
  listingId: string | null = null,
): Promise<OpenThreadResult> {
  if (!recipient) return { status: "error", code: "no_recipient" };
  // Can't message yourself or an identity you control.
  if (
    partiesEqual(actor.party, recipient) ||
    controlsParty(recipient, actor.userId, actor.actingCompanyIds)
  ) {
    return { status: "error", code: "forbidden" };
  }
  const thread = await findOrCreateThread(actor.party, recipient, listingId);
  return { status: "ok", threadId: thread.id };
}

/** "Message seller": open (or start) the thread about a listing with its owner. */
export async function startListingThread(
  actor: Actor,
  listingId: string,
): Promise<OpenThreadResult> {
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) return { status: "error", code: "no_listing" };
  return startPartyThread(actor, listingOwnerParty(listing), listingId);
}

export type SendMessageInput = {
  threadId: string;
  body?: string | null;
  /** Already-saved media URL, if any (the caller handles upload). */
  imageUrl?: string | null;
};

export type SendMessageResult =
  | { status: "sent"; threadId: string }
  | { status: "empty"; threadId: string }
  | { status: "error"; code: "no_thread" | "not_participant" };

/** Send a message in a thread, as the side the actor controls. */
export async function sendMessage(
  actor: Actor,
  input: SendMessageInput,
): Promise<SendMessageResult> {
  const body = (input.body ?? "").trim();
  const thread = await prisma.thread.findUnique({
    where: { id: input.threadId },
  });
  if (!thread) return { status: "error", code: "no_thread" };

  // Which side the actor speaks for becomes the sender identity.
  const acting = actor.actingCompanyIds;
  const { a, b } = threadParties(thread);
  const mySide = controlsParty(a, actor.userId, acting)
    ? "a"
    : controlsParty(b, actor.userId, acting)
      ? "b"
      : null;
  if (!mySide) return { status: "error", code: "not_participant" };
  const sender = mySide === "a" ? a : b;
  const recipient = mySide === "a" ? b : a;

  const imageUrl = input.imageUrl ?? null;
  if (!body && !imageUrl) return { status: "empty", threadId: input.threadId };

  await prisma.message.create({
    data: {
      threadId: input.threadId,
      senderUserId: actor.userId,
      senderCompanyId: sender.type === "company" ? sender.id : null,
      body,
      imageUrl,
    },
  });
  // Bump the thread (inbox sort) and mark it read for the sender's side.
  const senderRead =
    mySide === "a" ? { aLastReadAt: new Date() } : { bLastReadAt: new Date() };
  await prisma.thread.update({
    where: { id: input.threadId },
    data: { updatedAt: new Date(), ...senderRead },
  });

  // The display name of the sending identity.
  let senderName = actor.userName;
  if (sender.type === "company") {
    const co = await prisma.company.findUnique({
      where: { id: sender.id },
      select: { name: true },
    });
    senderName = co?.name ?? actor.userName;
  }
  await createNotification({
    recipient,
    type: "message",
    actorUserId: actor.userId,
    actorCompanyId: sender.type === "company" ? sender.id : null,
    title: `New message from ${senderName}`,
    body: body || "Sent a photo",
    href: `/messages/${input.threadId}`,
    threadId: input.threadId,
  });

  return { status: "sent", threadId: input.threadId };
}

/** Mark a thread read for the actor's side. Returns whether anything changed. */
export async function markThreadRead(
  actor: Actor,
  threadId: string,
): Promise<{ marked: boolean }> {
  const thread = await prisma.thread.findUnique({ where: { id: threadId } });
  if (!thread) return { marked: false };
  const acting = actor.actingCompanyIds;
  const { a, b } = threadParties(thread);
  const mySide = controlsParty(a, actor.userId, acting)
    ? "a"
    : controlsParty(b, actor.userId, acting)
      ? "b"
      : null;
  if (!mySide) return { marked: false };
  await prisma.thread.update({
    where: { id: threadId },
    data:
      mySide === "a" ? { aLastReadAt: new Date() } : { bLastReadAt: new Date() },
  });
  return { marked: true };
}
