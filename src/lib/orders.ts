import "server-only";
import type { Party, PartyType } from "@/lib/messaging";

/**
 * Order (transaction) party helpers (PRD §7 + company-as-actor). Buyer and
 * seller are parties (user | company), so a company's deals form its own orders
 * book separate from any member's personal orders.
 */

/** The six Transaction columns encoding the buyer + seller parties. */
export function txPartyColumns(buyer: Party, seller: Party) {
  return {
    buyerType: buyer.type,
    buyerUserId: buyer.type === "user" ? buyer.id : null,
    buyerCompanyId: buyer.type === "company" ? buyer.id : null,
    sellerType: seller.type,
    sellerUserId: seller.type === "user" ? seller.id : null,
    sellerCompanyId: seller.type === "company" ? seller.id : null,
  };
}

type TxSides = {
  buyerType: PartyType;
  buyerUserId: string | null;
  buyerCompanyId: string | null;
  sellerType: PartyType;
  sellerUserId: string | null;
  sellerCompanyId: string | null;
};

export function txParties(tx: TxSides): { buyer: Party; seller: Party } {
  return {
    buyer:
      tx.buyerType === "company"
        ? { type: "company", id: tx.buyerCompanyId! }
        : { type: "user", id: tx.buyerUserId! },
    seller:
      tx.sellerType === "company"
        ? { type: "company", id: tx.sellerCompanyId! }
        : { type: "user", id: tx.sellerUserId! },
  };
}

/** Prisma where-fragment: this party is the buyer. */
export function buyerWhere(party: Party) {
  return party.type === "company"
    ? { buyerCompanyId: party.id }
    : { buyerUserId: party.id };
}

/** Prisma where-fragment: this party is the seller. */
export function sellerWhere(party: Party) {
  return party.type === "company"
    ? { sellerCompanyId: party.id }
    : { sellerUserId: party.id };
}

/** Prisma where-fragment: this party is buyer OR seller (their orders book). */
export function involvedWhere(party: Party) {
  return party.type === "company"
    ? { OR: [{ buyerCompanyId: party.id }, { sellerCompanyId: party.id }] }
    : { OR: [{ buyerUserId: party.id }, { sellerUserId: party.id }] };
}

/** Include for rendering both order parties. */
export const txPartyInclude = {
  buyerUser: true,
  buyerCompany: true,
  sellerUser: true,
  sellerCompany: true,
} as const;

type TxWithParties = {
  buyerType: PartyType;
  buyerUser: { id: string; name: string; avatarUrl: string | null } | null;
  buyerCompany: { name: string; slug: string; logoUrl: string | null } | null;
  sellerType: PartyType;
  sellerUser: { id: string; name: string; avatarUrl: string | null } | null;
  sellerCompany: { name: string; slug: string; logoUrl: string | null } | null;
};

/** Display info for one side of an order (name, avatar, link, kind). */
export function orderPartyDisplay(
  tx: TxWithParties,
  side: "buyer" | "seller",
): { name: string; avatarUrl: string | null; href: string; kind: PartyType } {
  const type = side === "buyer" ? tx.buyerType : tx.sellerType;
  if (type === "company") {
    const c = side === "buyer" ? tx.buyerCompany : tx.sellerCompany;
    return {
      name: c?.name ?? "Company",
      avatarUrl: c?.logoUrl ?? null,
      href: c ? `/company/${c.slug}` : "#",
      kind: "company",
    };
  }
  const u = side === "buyer" ? tx.buyerUser : tx.sellerUser;
  return {
    name: u?.name ?? "User",
    avatarUrl: u?.avatarUrl ?? null,
    href: u ? `/u/${u.id}` : "#",
    kind: "user",
  };
}
