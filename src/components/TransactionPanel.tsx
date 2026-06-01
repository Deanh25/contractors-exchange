import Link from "next/link";
import {
  formatMoney,
  listingBadge,
  photosFromJson,
} from "@/lib/listings";
import {
  TX_STATUS,
  ctaForListing,
  isEscrowProtected,
} from "@/lib/transactions";
import {
  createTransactionAction,
  updateTransactionAction,
} from "@/app/actions/transaction";
import { createReviewAction } from "@/app/actions/review";
import { StarInput } from "@/components/StarInput";
import type { Listing, Transaction, Review } from "@/generated/prisma/client";

/**
 * The leakage-aware deal box for a listing thread (PRD §6-§7). Surfaces the
 * on-platform Buy/Bid/Complete action so finishing here is the path of least
 * resistance, and shows the (stubbed) escrow/buyer-protection state. Renders the
 * right controls for whoever is viewing - buyer or seller.
 */
export function TransactionPanel({
  listing,
  tx,
  myReview,
  viewerId,
  sellerId,
  buyerId,
  backPath,
}: {
  listing: Listing;
  tx: Transaction | null;
  myReview?: Review | null;
  viewerId: string;
  sellerId: string;
  buyerId: string;
  backPath: string;
}) {
  const isSeller = viewerId === sellerId;
  const isBuyer = viewerId === buyerId;
  const photo = photosFromJson(listing.photos)[0];
  const badge = listingBadge(listing.type, listing.tradeKind);
  const protectedDeal = isEscrowProtected(
    listing.type === "price" ? "purchase" : listing.type === "bid" ? "bid" : "trade_request",
  );

  const primaryBtn =
    "rounded-md bg-brand-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-600";
  const ghostBtn =
    "rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50";

  return (
    <div className="mt-3 rounded-xl border border-brand-200 bg-brand-50 p-3">
      {/* Listing summary */}
      <Link href={`/listings/${listing.id}`} className="flex items-center gap-3">
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-white">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center text-xl">🏗️</div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">
            {listing.title}
          </p>
          <p className="text-xs text-slate-600">
            <span className="font-medium">{badge.label}</span>
            {listing.type === "price" && ` · ${formatMoney(listing.price)}`}
            {listing.type === "bid" && ` · from ${formatMoney(listing.startReserve)}`}
          </p>
        </div>
        {tx && (
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${TX_STATUS[tx.status].tone}`}
          >
            {TX_STATUS[tx.status].label}
          </span>
        )}
      </Link>

      {/* Deal state + controls */}
      <div className="mt-3 border-t border-brand-200 pt-3">
        {tx ? (
          <div className="space-y-2">
            {tx.amount !== null && (
              <p className="text-sm text-slate-700">
                Amount: <span className="font-semibold">{formatMoney(tx.amount)}</span>
              </p>
            )}

            {tx.status === "pending" && isSeller && (
              <div className="flex gap-2">
                <Op id={tx.id} op="accept" back={backPath} className={primaryBtn}>
                  Accept
                </Op>
                <Op id={tx.id} op="decline" back={backPath} className={ghostBtn}>
                  Decline
                </Op>
              </div>
            )}
            {tx.status === "pending" && isBuyer && (
              <div className="flex items-center gap-2">
                <Op id={tx.id} op="cancel" back={backPath} className={ghostBtn}>
                  Cancel request
                </Op>
                <span className="text-xs text-slate-500">Waiting for the seller.</span>
              </div>
            )}
            {tx.status === "accepted" && (
              <div className="flex items-center gap-2">
                <Op id={tx.id} op="complete" back={backPath} className={primaryBtn}>
                  Mark completed
                </Op>
                <span className="text-xs text-slate-500">
                  {protectedDeal
                    ? "Funds would release from escrow here (stubbed in v1)."
                    : "Arrange the exchange directly."}
                </span>
              </div>
            )}
            {tx.status === "completed" && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-emerald-700">
                  Deal completed.
                </p>
                {myReview ? (
                  <p className="text-xs text-slate-500">
                    You left a {myReview.stars}-star review. Thanks for keeping it
                    on-platform.
                  </p>
                ) : (
                  <form
                    action={createReviewAction}
                    className="space-y-2 rounded-lg border border-slate-200 bg-white p-3"
                  >
                    <input type="hidden" name="transactionId" value={tx.id} />
                    <input type="hidden" name="back" value={backPath} />
                    <p className="text-sm font-medium text-slate-700">
                      Rate this deal
                    </p>
                    <StarInput />
                    <textarea
                      name="body"
                      rows={2}
                      placeholder="Optional: how did it go?"
                      className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                    />
                    <button type="submit" className={primaryBtn}>
                      Submit review
                    </button>
                  </form>
                )}
              </div>
            )}
            {(tx.status === "declined" || tx.status === "cancelled") && isBuyer && (
              <p className="text-xs text-slate-500">
                This request was {TX_STATUS[tx.status].label.toLowerCase()}. You can
                start a new one from the listing.
              </p>
            )}
          </div>
        ) : isBuyer ? (
          // No deal yet - the buyer can open one right here.
          <form action={createTransactionAction} className="space-y-2">
            <input type="hidden" name="listingId" value={listing.id} />
            {listing.type === "bid" && (
              <input
                name="amount"
                required
                inputMode="decimal"
                placeholder={`Your bid (from ${formatMoney(listing.startReserve)})`}
                className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
              />
            )}
            <div className="flex items-center gap-2">
              <button type="submit" className={primaryBtn}>
                {ctaForListing(listing.type)}
              </button>
              <span className="text-xs text-slate-500">
                {protectedDeal
                  ? "Complete on-platform for buyer protection."
                  : "Connect directly to arrange (no escrow)."}
              </span>
            </div>
          </form>
        ) : (
          <p className="text-xs text-slate-500">
            No request on this listing yet.
          </p>
        )}
      </div>
    </div>
  );
}

/** A single status-change submit button (accept/decline/complete/cancel). */
function Op({
  id,
  op,
  back,
  className,
  children,
}: {
  id: string;
  op: string;
  back: string;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <form action={updateTransactionAction}>
      <input type="hidden" name="transactionId" value={id} />
      <input type="hidden" name="op" value={op} />
      <input type="hidden" name="back" value={back} />
      <button type="submit" className={className}>
        {children}
      </button>
    </form>
  );
}
