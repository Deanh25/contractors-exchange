import Link from "next/link";
import { formatMoney, photosFromJson } from "@/lib/listings";
import { viewerCanRespond } from "@/lib/offers";
import { respondOfferAction } from "@/app/actions/offers";
import { SellerCounterForm } from "@/components/SellerCounterForm";
import type { Listing, Offer } from "@/generated/prisma/client";

/**
 * Live negotiation panel inside a message thread (PRD §7B). Shows the active
 * offer and, when it's the viewer's turn, accept / decline / counter. STRICT
 * per-role visibility: the SELLER sees their resulting net (and a note on how far
 * they've conceded); the BUYER sees only the buyer price. Net/margin are never
 * rendered on the buyer's branch.
 */
export function NegotiationPanel({
  listing,
  offer,
  viewerIsSeller,
}: {
  listing: Listing;
  offer: Offer;
  viewerIsSeller: boolean;
}) {
  const photo = photosFromJson(listing.photos)[0];
  const buyerPrice = Number(offer.buyerPrice);
  const canRespond = viewerCanRespond(offer.fromSide, viewerIsSeller);
  const madeBy =
    offer.fromSide === "buyer" ? "the buyer" : "the seller";

  // Seller-only figures (never computed into the buyer's view).
  const offerNet = Number(offer.sellerNet);
  const originalNet = listing.sellerNet === null ? null : Number(listing.sellerNet);
  const concession =
    originalNet !== null ? Math.round((originalNet - offerNet) * 100) / 100 : null;

  return (
    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
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
            Asking {formatMoney(listing.price)} · negotiating
          </p>
        </div>
      </Link>

      <div className="mt-3 border-t border-amber-200 pt-3">
        <p className="text-sm text-slate-700">
          Current offer from {madeBy}:{" "}
          <span className="font-bold text-slate-900">{formatMoney(buyerPrice)}</span>
        </p>
        {offer.message && (
          <p className="mt-0.5 text-xs text-slate-500">&ldquo;{offer.message}&rdquo;</p>
        )}

        {/* Seller-only: resulting net + concession awareness (informational). */}
        {viewerIsSeller && (
          <p className="mt-1 text-sm text-slate-700">
            You would net{" "}
            <span className="font-semibold text-slate-900">{formatMoney(offerNet)}</span>
            {concession !== null && concession > 0 && (
              <span className="text-slate-500">
                {" "}
                (down {formatMoney(concession)} from your {formatMoney(originalNet)} ask)
              </span>
            )}
            .
          </p>
        )}

        {canRespond ? (
          <div className="mt-3 flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              <form action={respondOfferAction}>
                <input type="hidden" name="offerId" value={offer.id} />
                <input type="hidden" name="op" value="accept" />
                <button
                  type="submit"
                  className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  Accept {viewerIsSeller ? `· net ${formatMoney(offerNet)}` : formatMoney(buyerPrice)}
                </button>
              </form>
              <form action={respondOfferAction}>
                <input type="hidden" name="offerId" value={offer.id} />
                <input type="hidden" name="op" value="decline" />
                <button
                  type="submit"
                  className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Decline
                </button>
              </form>
            </div>

            {viewerIsSeller ? (
              <SellerCounterForm
                offerId={offer.id}
                marginPct={offer.marginPct}
                buyerOffer={buyerPrice}
                askingPrice={listing.price === null ? null : Number(listing.price)}
              />
            ) : (
              <details>
                <summary className="cursor-pointer list-none rounded-md border border-slate-300 bg-white px-3 py-1.5 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">
                  Counter
                </summary>
                <form action={respondOfferAction} className="mt-2 flex items-center gap-2">
                  <input type="hidden" name="offerId" value={offer.id} />
                  <input type="hidden" name="op" value="counter" />
                  <input
                    name="buyerPrice"
                    inputMode="decimal"
                    placeholder="Your price"
                    className="w-36 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                  />
                  <button
                    type="submit"
                    className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-700"
                  >
                    Send
                  </button>
                </form>
              </details>
            )}
          </div>
        ) : (
          <p className="mt-2 text-xs font-medium text-slate-500">
            Waiting for the other side to respond to {formatMoney(buyerPrice)}.
          </p>
        )}
      </div>
    </div>
  );
}
