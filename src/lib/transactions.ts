import type {
  TransactionType,
  TransactionStatus,
} from "@/generated/prisma/client";
import { formatMoney } from "@/lib/listings";

/**
 * Presentation + copy helpers for transactions (PRD §7). Stubbed in v1: records
 * + notifications + escrow-protection messaging, but no money moves.
 */

export const TX_TYPE_LABEL: Record<TransactionType, string> = {
  purchase: "Purchase",
  bid: "Bid",
  trade_request: "Trade request",
};

export const TX_STATUS: Record<
  TransactionStatus,
  { label: string; tone: string }
> = {
  pending: { label: "Pending", tone: "bg-amber-100 text-amber-800" },
  accepted: { label: "Accepted", tone: "bg-sky-100 text-sky-800" },
  declined: { label: "Declined", tone: "bg-rose-100 text-rose-700" },
  completed: { label: "Completed", tone: "bg-emerald-100 text-emerald-800" },
  cancelled: { label: "Cancelled", tone: "bg-slate-100 text-slate-600" },
};

/** The transaction type a buyer would create from a listing of this type. */
export function txTypeForListing(listingType: string): TransactionType {
  if (listingType === "price") return "purchase";
  if (listingType === "bid") return "bid";
  return "trade_request";
}

/** Trades connect both parties directly (no escrow); purchases/bids are protected. */
export function isEscrowProtected(type: TransactionType): boolean {
  return type !== "trade_request";
}

/** The buyer's call-to-action label for a listing. */
export function ctaForListing(listingType: string): string {
  if (listingType === "price") return "Buy now - escrow protected";
  if (listingType === "bid") return "Place a bid";
  return "Request exchange";
}

/** Auto-message posted to the thread when a buyer opens a deal (notifies seller). */
export function txCreatedMessage(
  type: TransactionType,
  amount: number | null,
  title: string,
): string {
  if (type === "purchase")
    return `🛒 Requested to buy "${title}" for ${formatMoney(amount)} - on-platform, escrow protected.`;
  if (type === "bid")
    return `🔨 Placed a bid of ${formatMoney(amount)} on "${title}".`;
  return `🔁 Requested a trade for "${title}". Trades connect directly (no escrow).`;
}

/** Auto-message posted when a deal's status changes. */
export function txStatusMessage(
  status: TransactionStatus,
  actorName: string,
): string {
  switch (status) {
    case "accepted":
      return `✅ ${actorName} accepted the request. Complete on-platform when ready.`;
    case "declined":
      return `❌ ${actorName} declined the request.`;
    case "completed":
      return `🎉 Deal marked completed. (Payments are stubbed in v1.)`;
    case "cancelled":
      return `↩️ ${actorName} cancelled the request.`;
    default:
      return "";
  }
}
