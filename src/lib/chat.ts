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
  /** Round 2: set only on an optimistic message that hasn't been confirmed yet. */
  pending?: "sending" | "failed";
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
  createdAt: Date;
  /** Round 2: set while an optimistic message is in flight or has failed. */
  pending?: "sending" | "failed";
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
      createdAt: m.createdAt,
      ...(m.pending ? { pending: m.pending } : {}),
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
