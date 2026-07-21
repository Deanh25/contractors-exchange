import "server-only";
import { prisma } from "@/lib/prisma";
import {
  findOrCreateThread,
  listingOwnerParty,
  threadParties,
  partiesEqual,
  controlsParty,
  messageFromParty,
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

// --- Conversation view model (Round 1 messenger) -----------------------------

/** A message as the conversation view needs it (sender identity resolved). */
export type ChatMessage = {
  id: string;
  kind: "user" | "event";
  body: string;
  imageUrl: string | null;
  createdAt: Date;
  senderUserId: string;
  senderCompanyId: string | null;
  senderUser: { id: string; name: string; avatarUrl: string | null };
  senderCompany: { name: string; slug: string; logoUrl: string | null } | null;
};

export type ChatSender = {
  name: string;
  avatarUrl: string | null;
  href: string;
  kind: "user" | "company";
  /** For company-sent messages: which human actually typed it. */
  attribution: string | null;
};

/**
 * One rendered row of the conversation: a day divider, a centered deal-event
 * chip, or a GROUP of consecutive messages from the same identity (one avatar +
 * one timestamp, Messenger-style).
 */
export type ChatItem =
  | { type: "day"; key: string; at: Date }
  | { type: "event"; key: string; body: string; at: Date }
  | {
      type: "group";
      key: string;
      own: boolean;
      sender: ChatSender;
      at: Date;
      messages: Pick<ChatMessage, "id" | "body" | "imageUrl" | "createdAt">[];
    };

/** Consecutive messages group only while they stay inside this window. */
const GROUP_WINDOW_MS = 5 * 60 * 1000;

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function senderOf(m: ChatMessage): ChatSender {
  if (m.senderCompany) {
    return {
      name: m.senderCompany.name,
      avatarUrl: m.senderCompany.logoUrl,
      href: `/company/${m.senderCompany.slug}`,
      kind: "company",
      attribution: m.senderUser.name,
    };
  }
  return {
    name: m.senderUser.name,
    avatarUrl: m.senderUser.avatarUrl,
    href: `/u/${m.senderUser.id}`,
    kind: "user",
    attribution: null,
  };
}

/**
 * Build the conversation rows: day dividers, deal-event chips, and grouped runs
 * of consecutive messages from one identity. Pure + framework-agnostic so the
 * future mobile client renders the same conversation from the same model.
 * `messages` must be in ascending createdAt order.
 */
export function groupThreadMessages(
  messages: ChatMessage[],
  myParty: Party,
): ChatItem[] {
  const items: ChatItem[] = [];
  let lastDay: Date | null = null;
  // The run we're currently appending to, and the identity that owns it. Both
  // reset on a day divider or a deal event, so those always break a group.
  let openGroup: Extract<ChatItem, { type: "group" }> | null = null;
  let openIdentity: string | null = null;

  for (const m of messages) {
    if (!lastDay || !sameDay(lastDay, m.createdAt)) {
      items.push({
        type: "day",
        key: `day-${m.createdAt.toISOString().slice(0, 10)}`,
        at: m.createdAt,
      });
      lastDay = m.createdAt;
      openGroup = null;
      openIdentity = null;
    }

    // Deal events are system chips: never grouped, never "owned" by a side.
    if (m.kind === "event") {
      items.push({ type: "event", key: m.id, body: m.body, at: m.createdAt });
      openGroup = null;
      openIdentity = null;
      continue;
    }

    const own = messageFromParty(m, myParty);
    const identity = m.senderCompanyId ?? m.senderUserId;
    const entry = {
      id: m.id,
      body: m.body,
      imageUrl: m.imageUrl,
      createdAt: m.createdAt,
    };

    if (
      openGroup &&
      openIdentity === identity &&
      openGroup.own === own &&
      m.createdAt.getTime() - openGroup.at.getTime() <= GROUP_WINDOW_MS
    ) {
      openGroup.messages.push(entry);
      openGroup.at = m.createdAt; // group timestamp = its most recent message
    } else {
      openGroup = {
        type: "group",
        key: `grp-${m.id}`,
        own,
        sender: senderOf(m),
        at: m.createdAt,
        messages: [entry],
      };
      openIdentity = identity;
      items.push(openGroup);
    }
  }

  return items;
}
