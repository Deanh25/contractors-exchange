import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Messaging (PRD §6 + company-as-actor). A thread is between two PARTIES, where
 * a party is a User or a Company. Buyers message a company directly; permitted
 * team members reply as the company. Parties are canonicalized (aKey <= bKey) so
 * a pair maps to one thread per listing context.
 */

export type PartyType = "user" | "company";
export type Party = { type: PartyType; id: string };

export function partyKey(p: Party): string {
  return `${p.type}:${p.id}`;
}

export function partiesEqual(a: Party, b: Party): boolean {
  return a.type === b.type && a.id === b.id;
}

/** Canonical order so (p1,p2) and (p2,p1) resolve to the same thread. */
export function canonicalParties(p1: Party, p2: Party): { a: Party; b: Party } {
  return partyKey(p1) <= partyKey(p2) ? { a: p1, b: p2 } : { a: p2, b: p1 };
}

/** The six Thread columns that encode a canonical party pair. */
function pairColumns(a: Party, b: Party) {
  return {
    aType: a.type,
    aUserId: a.type === "user" ? a.id : null,
    aCompanyId: a.type === "company" ? a.id : null,
    bType: b.type,
    bUserId: b.type === "user" ? b.id : null,
    bCompanyId: b.type === "company" ? b.id : null,
  };
}

type ThreadSides = {
  aType: PartyType;
  aUserId: string | null;
  aCompanyId: string | null;
  bType: PartyType;
  bUserId: string | null;
  bCompanyId: string | null;
};

/** Extract the two parties from a thread row. */
export function threadParties(t: ThreadSides): { a: Party; b: Party } {
  return {
    a:
      t.aType === "company"
        ? { type: "company", id: t.aCompanyId! }
        : { type: "user", id: t.aUserId! },
    b:
      t.bType === "company"
        ? { type: "company", id: t.bCompanyId! }
        : { type: "user", id: t.bUserId! },
  };
}

/** Does this user control (speak for) a given party? (themselves, or a company
 * they may act for - pass the precomputed set of those company ids). */
export function controlsParty(
  party: Party,
  userId: string,
  actingCompanyIds: Set<string>,
): boolean {
  return party.type === "user"
    ? party.id === userId
    : actingCompanyIds.has(party.id);
}

/** Which side ("a" | "b") does this party sit on, or null if neither. */
export function sideOfParty(
  t: ThreadSides,
  party: Party,
): "a" | "b" | null {
  const { a, b } = threadParties(t);
  if (partiesEqual(a, party)) return "a";
  if (partiesEqual(b, party)) return "b";
  return null;
}

type MessageSender = { senderUserId: string; senderCompanyId: string | null };

/** Was this message sent by the given party? */
export function messageFromParty(m: MessageSender, party: Party): boolean {
  return party.type === "company"
    ? m.senderCompanyId === party.id
    : m.senderUserId === party.id && m.senderCompanyId === null;
}

type ReadFields = ThreadSides & {
  aLastReadAt: Date | null;
  bLastReadAt: Date | null;
};

/** Is the latest message unread for the viewer's side? (Latest is from the
 * other party and newer than this side's last-read time.) */
export function threadIsUnread(
  thread: ReadFields,
  mySide: "a" | "b",
  lastMessage: MessageSender & { createdAt: Date } | null | undefined,
): boolean {
  if (!lastMessage) return false;
  const myParty = mySide === "a" ? threadParties(thread).a : threadParties(thread).b;
  if (messageFromParty(lastMessage, myParty)) return false;
  const lastRead = mySide === "a" ? thread.aLastReadAt : thread.bLastReadAt;
  return !lastRead || lastMessage.createdAt > lastRead;
}

/** Find (or create) the 1:1 thread between two parties for an optional listing. */
export async function findOrCreateThread(
  p1: Party,
  p2: Party,
  listingId: string | null = null,
) {
  const { a, b } = canonicalParties(p1, p2);
  const cols = pairColumns(a, b);
  const existing = await prisma.thread.findFirst({ where: { ...cols, listingId } });
  if (existing) return existing;
  return prisma.thread.create({ data: { ...cols, listingId } });
}

/** Read-only lookup of the thread between two parties (no side effects). */
export async function findThread(
  p1: Party,
  p2: Party,
  listingId: string | null = null,
) {
  const { a, b } = canonicalParties(p1, p2);
  return prisma.thread.findFirst({
    where: { ...pairColumns(a, b), listingId },
  });
}

/** A company's primary (earliest) owner user id, or null. */
export async function resolveCompanyOwner(
  companyId: string,
): Promise<string | null> {
  const owner = await prisma.membership.findFirst({
    where: { companyId, role: "owner" },
    orderBy: { createdAt: "asc" },
  });
  return owner?.userId ?? null;
}

/** The party that owns a listing (the company storefront, or the sole operator). */
export function listingOwnerParty(listing: {
  ownerUserId: string | null;
  ownerCompanyId: string | null;
}): Party | null {
  if (listing.ownerCompanyId)
    return { type: "company", id: listing.ownerCompanyId };
  if (listing.ownerUserId) return { type: "user", id: listing.ownerUserId };
  return null;
}

/** The owner USER for a listing (a company's primary owner). Transactions are
 * still user-keyed until orders become party-aware (8.3). */
export async function resolveListingRecipient(listing: {
  ownerUserId: string | null;
  ownerCompanyId: string | null;
}): Promise<string | null> {
  if (listing.ownerUserId) return listing.ownerUserId;
  if (listing.ownerCompanyId) return resolveCompanyOwner(listing.ownerCompanyId);
  return null;
}

/** Thread include for rendering both parties + last message author. */
export const threadPartyInclude = {
  aUser: true,
  aCompany: true,
  bUser: true,
  bCompany: true,
} as const;

/** Display info for one side of a thread (name, avatar, link, kind). */
export function partyDisplay(
  thread: {
    aType: PartyType;
    aUser: { id: string; name: string; avatarUrl: string | null } | null;
    aCompany: { name: string; slug: string; logoUrl: string | null } | null;
    bType: PartyType;
    bUser: { id: string; name: string; avatarUrl: string | null } | null;
    bCompany: { name: string; slug: string; logoUrl: string | null } | null;
  },
  side: "a" | "b",
): { name: string; avatarUrl: string | null; href: string; kind: PartyType } {
  const type = side === "a" ? thread.aType : thread.bType;
  if (type === "company") {
    const c = side === "a" ? thread.aCompany : thread.bCompany;
    return {
      name: c?.name ?? "Company",
      avatarUrl: c?.logoUrl ?? null,
      href: c ? `/company/${c.slug}` : "#",
      kind: "company",
    };
  }
  const u = side === "a" ? thread.aUser : thread.bUser;
  return {
    name: u?.name ?? "User",
    avatarUrl: u?.avatarUrl ?? null,
    href: u ? `/u/${u.id}` : "#",
    kind: "user",
  };
}

/** Count of the party's threads with an unread latest message (for badges). */
export async function getUnreadCount(party: Party): Promise<number> {
  const where =
    party.type === "company"
      ? { OR: [{ aCompanyId: party.id }, { bCompanyId: party.id }] }
      : { OR: [{ aUserId: party.id }, { bUserId: party.id }] };
  const threads = await prisma.thread.findMany({
    where,
    select: {
      aType: true,
      aUserId: true,
      aCompanyId: true,
      bType: true,
      bUserId: true,
      bCompanyId: true,
      aLastReadAt: true,
      bLastReadAt: true,
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { senderUserId: true, senderCompanyId: true, createdAt: true },
      },
    },
  });
  let n = 0;
  for (const t of threads) {
    const side = sideOfParty(t, party);
    if (side && threadIsUnread(t, side, t.messages[0])) n++;
  }
  return n;
}
