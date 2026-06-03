import Link from "next/link";
import { formatMoney, listingBadge, photosFromJson } from "@/lib/listings";
import { TX_STATUS, ctaForListing } from "@/lib/transactions";
import type { Listing, Transaction } from "@/generated/prisma/client";

/**
 * Compact deal context inside a message thread (PRD §6-§7). The thread is now a
 * SIDE channel: this just summarizes the listing + deal status and links to the
 * dedicated order page where the deal is actually managed (the "checkout" surface).
 */
export function TransactionPanel({
  listing,
  tx,
  isBuyer,
}: {
  listing: Listing;
  tx: Transaction | null;
  /** Is the viewer on the buyer side of this deal? (drives the checkout CTA) */
  isBuyer: boolean;
}) {
  const photo = photosFromJson(listing.photos)[0];
  const badge = listingBadge(listing.type, listing.tradeKind);
  const primaryBtn =
    "shrink-0 rounded-md bg-brand-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-600";

  return (
    <div className="mt-3 rounded-xl border border-brand-200 bg-brand-50 p-3">
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

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-brand-200 pt-3">
        {tx ? (
          <>
            <span className="text-sm text-slate-600">
              {tx.amount !== null ? (
                <>
                  Amount <span className="font-semibold">{formatMoney(tx.amount)}</span>
                </>
              ) : (
                "Manage this deal on the order page."
              )}
            </span>
            <Link href={`/orders/${tx.id}`} className={primaryBtn}>
              View order →
            </Link>
          </>
        ) : isBuyer ? (
          <>
            <span className="text-xs text-slate-500">
              Complete on-platform for buyer protection.
            </span>
            <Link href={`/checkout/${listing.id}`} className={primaryBtn}>
              {ctaForListing(listing.type)}
            </Link>
          </>
        ) : (
          <span className="text-xs text-slate-500">
            No request on this listing yet.
          </span>
        )}
      </div>
    </div>
  );
}
