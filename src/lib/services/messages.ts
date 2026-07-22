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
import { parseAttachments, MESSAGE_EMOJI } from "@/lib/chat";
import type { ChatMessage, ChatAttachment, ChatReaction } from "@/lib/chat";
import type { Prisma } from "@/generated/prisma/client";

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
  /** Round 3: already-saved attachments, in the order they were picked. */
  attachments?: ChatAttachment[] | null;
  /** Round 3: the message being replied to. Must live in the same thread. */
  replyToId?: string | null;
};

export type SendMessageResult =
  /** `message` lets a live client swap its optimistic bubble for the real row. */
  | { status: "sent"; threadId: string; message: ChatMessage }
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

  const attachments = input.attachments ?? [];
  // `imageUrl` stays the cover mirror: the first visual attachment, so older
  // renderers and notification previews keep working.
  const imageUrl =
    input.imageUrl ??
    attachments.find((a) => a.kind === "image" || a.kind === "video")?.url ??
    null;
  if (!body && attachments.length === 0 && !imageUrl) {
    return { status: "empty", threadId: input.threadId };
  }

  // A reply may only quote a message from THIS thread; otherwise it would leak
  // a snippet of a conversation the sender might not even be part of.
  let replyToId: string | null = null;
  if (input.replyToId) {
    const parent = await prisma.message.findUnique({
      where: { id: input.replyToId },
      select: { id: true, threadId: true },
    });
    if (parent?.threadId === input.threadId) replyToId = parent.id;
  }

  const created = await prisma.message.create({
    data: {
      threadId: input.threadId,
      senderUserId: actor.userId,
      senderCompanyId: sender.type === "company" ? sender.id : null,
      body,
      imageUrl,
      attachments: attachments.length > 0 ? attachments : undefined,
      replyToId,
    },
    include: chatMessageInclude,
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

  return {
    status: "sent",
    threadId: input.threadId,
    message: toChatMessage(created),
  };
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
    data: {
      ...(mySide === "a"
        ? { aLastReadAt: new Date() }
        : { bLastReadAt: new Date() }),
      // Reading a thread is not activity in it: preserve @updatedAt so simply
      // opening a conversation doesn't jump it to the top of the inbox.
      updatedAt: thread.updatedAt,
    },
  });
  return { marked: true };
}

// --- Conversation view model -------------------------------------------------
//
// The model itself lives in src/lib/chat.ts (pure, client-safe) because the live
// conversation regroups messages in the browser as polling delivers them. Server
// callers keep importing it from here.

export {
  groupThreadMessages,
  chatMessageIsOwn,
  summarizeReactions,
  reactionsByMessage,
  parseAttachments,
  formatBytes,
  MESSAGE_EMOJI,
  type ChatMessage,
  type ChatSender,
  type ChatItem,
  type ChatEntry,
  type ChatAttachment,
  type ChatReaction,
  type ChatReplyTo,
  type ReactionSummary,
} from "@/lib/chat";

/**
 * The ONLY related fields a conversation needs. Use this everywhere a message is
 * loaded for display: since Round 2 the conversation is a client component and
 * messages also travel over the poll endpoint, so `include: { senderUser: true }`
 * would ship the whole User row (password hash, email, address) to the browser.
 */
export const chatMessageInclude = {
  senderUser: { select: { id: true, name: true, avatarUrl: true } },
  senderCompany: { select: { name: true, slug: true, logoUrl: true } },
  // One level only: the quote shows the parent, never the parent's own quote.
  replyTo: {
    select: {
      id: true,
      body: true,
      imageUrl: true,
      attachments: true,
      senderUser: { select: { name: true } },
      senderCompany: { select: { name: true } },
    },
  },
} as const;

type MessageRow = Prisma.MessageGetPayload<{
  include: typeof chatMessageInclude;
}>;

/** A one-line stand-in when a quoted message had no text of its own. */
function excerptOf(m: {
  body: string;
  imageUrl: string | null;
  attachments: unknown;
}): string {
  if (m.body.trim()) return m.body;
  const files = parseAttachments(m.attachments);
  if (files.length > 0) {
    const first = files[0];
    if (first.kind === "file") return first.name;
    return files.length > 1 ? `${files.length} attachments` : "Photo";
  }
  return m.imageUrl ? "Photo" : "Message";
}

/** Map a stored message row to the conversation's view model. */
export function toChatMessage(m: MessageRow): ChatMessage {
  return {
    id: m.id,
    kind: m.kind,
    body: m.body,
    imageUrl: m.imageUrl,
    attachments: parseAttachments(m.attachments),
    replyTo: m.replyTo
      ? {
          id: m.replyTo.id,
          author:
            m.replyTo.senderCompany?.name ?? m.replyTo.senderUser.name,
          excerpt: excerptOf(m.replyTo),
        }
      : null,
    createdAt: m.createdAt,
    senderUserId: m.senderUserId,
    senderCompanyId: m.senderCompanyId,
    senderUser: m.senderUser,
    senderCompany: m.senderCompany,
  };
}

// --- Live updates (Round 2) --------------------------------------------------

/** How long after a keystroke the other side still counts as "typing". */
const TYPING_TTL_MS = 6000;

/** What the shape of the thread looks like to one side, right now. */
export type ThreadUpdates = {
  /** Messages created after the caller's `since` cursor, oldest first. */
  messages: ChatMessage[];
  /** ALL reactions in the thread (see the note where this is built). */
  reactions: ChatReaction[];
  /** The other side's read cursor, which drives the "Seen" receipt. */
  otherLastReadAt: Date | null;
  /** Is the other side typing right now? */
  otherTyping: boolean;
  /** Server clock, so the client's next `since` cursor can't drift. */
  now: Date;
};

export type ThreadUpdatesResult =
  | { status: "ok"; updates: ThreadUpdates }
  | { status: "error"; code: "no_thread" | "not_participant" };

/** Which side of a thread this actor speaks for, or null if neither. */
async function sideFor(
  actor: Actor,
  threadId: string,
): Promise<{
  thread: Awaited<ReturnType<typeof prisma.thread.findUnique>>;
  side: "a" | "b" | null;
}> {
  const thread = await prisma.thread.findUnique({ where: { id: threadId } });
  if (!thread) return { thread: null, side: null };
  const acting = actor.actingCompanyIds;
  const { a, b } = threadParties(thread);
  const side = controlsParty(a, actor.userId, acting)
    ? "a"
    : controlsParty(b, actor.userId, acting)
      ? "b"
      : null;
  return { thread, side };
}

/**
 * Everything that may have changed in a thread since the caller last looked:
 * new messages, the other side's read cursor, and whether they're typing.
 * Polled by the web client; a mobile client can poll the same service.
 */
export async function getThreadUpdates(
  actor: Actor,
  input: { threadId: string; since: Date | null },
): Promise<ThreadUpdatesResult> {
  const { thread, side } = await sideFor(actor, input.threadId);
  if (!thread) return { status: "error", code: "no_thread" };
  if (!side) return { status: "error", code: "not_participant" };

  const now = new Date();
  const messages = await prisma.message.findMany({
    where: {
      threadId: input.threadId,
      ...(input.since ? { createdAt: { gt: input.since } } : {}),
    },
    orderBy: { createdAt: "asc" },
    include: chatMessageInclude,
    // A guard, not a page: only a burst of messages while the tab was hidden
    // could approach this, and the next poll picks up whatever is left.
    take: 200,
  });

  const otherTypingAt = side === "a" ? thread.bTypingAt : thread.aTypingAt;
  return {
    status: "ok",
    updates: {
      messages: messages.map(toChatMessage),
      // Reactions come back WHOLE, not "since the cursor": a reaction can be
      // removed as well as added, and a delete leaves nothing to send. The
      // client replaces its map outright, so removals disappear correctly.
      reactions: await getThreadReactions(input.threadId),
      otherLastReadAt: side === "a" ? thread.bLastReadAt : thread.aLastReadAt,
      otherTyping:
        !!otherTypingAt &&
        now.getTime() - otherTypingAt.getTime() < TYPING_TTL_MS,
      now,
    },
  };
}

/** Every reaction in a thread, flattened for display. */
export async function getThreadReactions(
  threadId: string,
): Promise<ChatReaction[]> {
  const rows = await prisma.messageReaction.findMany({
    where: { message: { threadId } },
    select: {
      messageId: true,
      emoji: true,
      userId: true,
      companyId: true,
      user: { select: { name: true } },
      company: { select: { name: true } },
    },
    orderBy: { createdAt: "asc" },
    take: 500,
  });
  return rows.map((r) => ({
    messageId: r.messageId,
    emoji: r.emoji,
    userId: r.userId,
    companyId: r.companyId,
    name: r.company?.name ?? r.user.name,
  }));
}

export type ToggleReactionResult =
  | { status: "ok"; reactions: ChatReaction[] }
  | { status: "error"; code: "no_message" | "not_participant" | "bad_emoji" };

/**
 * Add, swap, or clear the actor's reaction on a message. One reaction per
 * identity per message (Messenger/LinkedIn behavior): the same emoji clears it,
 * a different one replaces it. Returns the thread's reactions so the caller can
 * repaint without a second round trip.
 */
export async function toggleMessageReaction(
  actor: Actor,
  input: { messageId: string; emoji: string },
): Promise<ToggleReactionResult> {
  // Only from the offered set: `emoji` is rendered straight into the UI and
  // stored, so it must never be arbitrary caller-supplied text.
  if (!(MESSAGE_EMOJI as readonly string[]).includes(input.emoji)) {
    return { status: "error", code: "bad_emoji" };
  }

  const message = await prisma.message.findUnique({
    where: { id: input.messageId },
    select: { id: true, threadId: true },
  });
  if (!message) return { status: "error", code: "no_message" };

  // You may only react inside a thread you are a party to.
  const { side } = await sideFor(actor, message.threadId);
  if (!side) return { status: "error", code: "not_participant" };

  const companyId =
    actor.party.type === "company" ? actor.party.id : null;
  const existing = await prisma.messageReaction.findUnique({
    where: { messageId_userId: { messageId: message.id, userId: actor.userId } },
  });

  if (!existing) {
    await prisma.messageReaction.create({
      data: {
        messageId: message.id,
        userId: actor.userId,
        companyId,
        emoji: input.emoji,
      },
    });
  } else if (existing.emoji === input.emoji && existing.companyId === companyId) {
    await prisma.messageReaction.delete({ where: { id: existing.id } });
  } else {
    await prisma.messageReaction.update({
      where: { id: existing.id },
      data: { emoji: input.emoji, companyId },
    });
  }

  return { status: "ok", reactions: await getThreadReactions(message.threadId) };
}

/**
 * Mark the actor's side as typing (the client throttles these). The stamp
 * expires on its own via TYPING_TTL_MS, so there is nothing to clear.
 */
export async function setTyping(
  actor: Actor,
  threadId: string,
): Promise<{ ok: boolean }> {
  const { thread, side } = await sideFor(actor, threadId);
  if (!thread || !side) return { ok: false };
  await prisma.thread.update({
    where: { id: threadId },
    data: {
      ...(side === "a" ? { aTypingAt: new Date() } : { bTypingAt: new Date() }),
      // `updatedAt` is @updatedAt, so Prisma would stamp it on this write and
      // shuffle the thread to the top of the inbox on EVERY keystroke. Passing
      // the existing value explicitly keeps the inbox order meaning "last
      // message", which is what it sorts by.
      updatedAt: thread.updatedAt,
    },
  });
  return { ok: true };
}
