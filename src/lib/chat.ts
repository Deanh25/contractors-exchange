/**
 * Conversation view model: turns a flat list of messages into the rows the
 * conversation renders (day dividers, deal-event chips, and grouped runs of
 * consecutive messages from one identity).
 *
 * Pure and dependency-free ON PURPOSE. This module must NOT import "server-only"
 * or anything that does, because the live conversation (messenger Round 2)
 * regroups messages on the CLIENT as they arrive from polling, and the future
 * Expo app will render the same conversation from the same model.
 * `src/lib/services/messages.ts` re-exports all of this for server callers.
 */

/** Structurally identical to `Party` in src/lib/messaging.ts, which is server-only. */
export type ChatParty = { type: "user" | "company"; id: string };

/** One file on a message (Round 3): a photo, a video, or a document. */
export type ChatAttachment = {
  url: string;
  kind: "image" | "video" | "file";
  /** Original filename, shown for documents. */
  name: string;
  /** Bytes, for the "1.2 MB" caption. */
  size: number;
};

/** The message being replied to, as the quote above a bubble needs it. */
export type ChatReplyTo = {
  id: string;
  /** Display name of whoever wrote the quoted message. */
  author: string;
  /** Body, or a stand-in like "Photo" when the original was media only. */
  excerpt: string;
};

/** One person's reaction to one message. */
export type ChatReaction = {
  messageId: string;
  emoji: string;
  userId: string;
  companyId: string | null;
  /** Display name of the reacting identity, for the tooltip. */
  name: string;
};

/** Reactions on one message, collapsed for display. */
export type ReactionSummary = {
  emoji: string;
  count: number;
  /** Did the viewer's acting identity leave this one? */
  mine: boolean;
  /** Who reacted, for the hover tooltip. */
  names: string[];
};

/** A message as the conversation view needs it (sender identity resolved). */
export type ChatMessage = {
  id: string;
  kind: "user" | "event";
  body: string;
  imageUrl: string | null;
  attachments: ChatAttachment[];
  replyTo: ChatReplyTo | null;
  createdAt: Date;
  senderUserId: string;
  senderCompanyId: string | null;
  senderUser: { id: string; name: string; avatarUrl: string | null };
  senderCompany: { name: string; slug: string; logoUrl: string | null } | null;
  /** Round 2: set only on an optimistic message that hasn't been confirmed yet. */
  pending?: "sending" | "failed";
  /** Why a failed send failed, shown under the bubble (item 6). */
  failedReason?: string;
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
      messages: ChatEntry[];
    };

/** A single bubble inside a group. */
export type ChatEntry = {
  id: string;
  body: string;
  imageUrl: string | null;
  attachments: ChatAttachment[];
  replyTo: ChatReplyTo | null;
  createdAt: Date;
  /** Round 2: set while an optimistic message is in flight or has failed. */
  pending?: "sending" | "failed";
  /** Why a failed send failed, shown under the bubble (item 6). */
  failedReason?: string;
};

/**
 * The reaction set offered on a message. Deliberately the Messenger/LinkedIn
 * shortlist rather than CX's post reactions (which are lucide icons meant for
 * feed posts): a conversation wants quick human acknowledgement.
 */
export const MESSAGE_EMOJI = ["👍", "❤️", "😂", "😮", "😢", "🙏"] as const;

/** Collapse one message's reactions into per-emoji counts for display. */
export function summarizeReactions(
  reactions: ChatReaction[],
  myParty: ChatParty,
): ReactionSummary[] {
  const byEmoji = new Map<string, ReactionSummary>();
  for (const r of reactions) {
    const mine =
      myParty.type === "company"
        ? r.companyId === myParty.id
        : r.userId === myParty.id && r.companyId === null;
    const found = byEmoji.get(r.emoji);
    if (found) {
      found.count += 1;
      found.mine ||= mine;
      found.names.push(r.name);
    } else {
      byEmoji.set(r.emoji, {
        emoji: r.emoji,
        count: 1,
        mine,
        names: [r.name],
      });
    }
  }
  // Most-reacted first, so the busiest emoji reads first.
  return [...byEmoji.values()].sort((a, b) => b.count - a.count);
}

/** Group reactions by the message they belong to. */
export function reactionsByMessage(
  reactions: ChatReaction[],
): Map<string, ChatReaction[]> {
  const map = new Map<string, ChatReaction[]>();
  for (const r of reactions) {
    const list = map.get(r.messageId);
    if (list) list.push(r);
    else map.set(r.messageId, [r]);
  }
  return map;
}

/**
 * Read the `attachments` JSON column into typed attachments, tolerating
 * anything malformed (the column is free-form JSON, so never trust its shape).
 */
export function parseAttachments(raw: unknown): ChatAttachment[] {
  if (!Array.isArray(raw)) return [];
  const out: ChatAttachment[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const a = item as Record<string, unknown>;
    if (typeof a.url !== "string" || !a.url) continue;
    const kind =
      a.kind === "image" || a.kind === "video" || a.kind === "file"
        ? a.kind
        : "file";
    out.push({
      url: a.url,
      kind,
      name: typeof a.name === "string" ? a.name : "Attachment",
      size: typeof a.size === "number" ? a.size : 0,
    });
  }
  return out;
}

// --- attachment validation (shared client + server) --------------------------
//
// One source of truth for what a message may carry, so the composer can reject a
// bad file with a precise reason BEFORE uploading (item 6: no more "check your
// connection" for a file that was simply too big or the wrong type), and the
// server enforces the same limits. Must stay in sync with src/lib/storage.ts.

export const ATTACHMENT_MAX = {
  image: 8 * 1024 * 1024, // 8 MB
  video: 100 * 1024 * 1024, // 100 MB
  file: 25 * 1024 * 1024, // 25 MB (documents)
} as const;

const IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);
const VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);
const DOC_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "text/plain",
]);

/** Which bucket a MIME type falls in, or null if it is not an allowed type. */
export function classifyUpload(
  type: string,
): "image" | "video" | "file" | null {
  if (IMAGE_TYPES.has(type)) return "image";
  if (VIDEO_TYPES.has(type)) return "video";
  if (DOC_TYPES.has(type)) return "file";
  return null;
}

/**
 * Why a file can't be sent, as a sentence to show the user, or null if it's
 * fine. Names the real reason: unsupported type, or too large with the limit.
 */
export function attachmentError(file: {
  name: string;
  type: string;
  size: number;
}): string | null {
  const kind = classifyUpload(file.type);
  if (!kind) return `"${file.name}" isn't a supported file type.`;
  const max = ATTACHMENT_MAX[kind];
  if (file.size > max) {
    const noun = kind === "video" ? "video" : kind === "image" ? "image" : "file";
    return `That ${noun} is too large (max ${formatBytes(max)}).`;
  }
  return null;
}

/** Should this attachment render as a video player? */
export function isVideoAttachment(a: ChatAttachment): boolean {
  // Trust `kind`, but fall back to the extension for anything stored before
  // the kind was recorded.
  return a.kind === "video" || /\.(mp4|webm|mov)$/i.test(a.url);
}

/** "1.2 MB" - the caption under a document attachment. */
export function formatBytes(size: number): string {
  if (!size || size < 1024) return `${Math.max(0, size)} B`;
  const kb = size / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

/** Consecutive messages group only while they stay inside this window. */
const GROUP_WINDOW_MS = 5 * 60 * 1000;

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Did this party send the message? (Mirrors `messageFromParty` in the
 * server-only messaging lib; duplicated here to keep this module client-safe.)
 */
export function chatMessageIsOwn(
  m: Pick<ChatMessage, "senderUserId" | "senderCompanyId">,
  party: ChatParty,
): boolean {
  return party.type === "company"
    ? m.senderCompanyId === party.id
    : m.senderUserId === party.id && m.senderCompanyId === null;
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
 * of consecutive messages from one identity. `messages` must be in ascending
 * createdAt order.
 */
export function groupThreadMessages(
  messages: ChatMessage[],
  myParty: ChatParty,
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

    const own = chatMessageIsOwn(m, myParty);
    const identity = m.senderCompanyId ?? m.senderUserId;
    const entry: ChatEntry = {
      id: m.id,
      body: m.body,
      imageUrl: m.imageUrl,
      attachments: m.attachments,
      replyTo: m.replyTo,
      createdAt: m.createdAt,
      ...(m.pending ? { pending: m.pending } : {}),
      ...(m.failedReason ? { failedReason: m.failedReason } : {}),
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
