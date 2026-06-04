import Link from "next/link";
import {
  formatMoney,
  listingBadge,
  photosFromJson,
  listingOwner,
  isVideoUrl,
  type ListingWithOwner,
} from "@/lib/listings";
import { tradeLabel } from "@/lib/trades";
import { metroLabel } from "@/lib/locations";
import { formatMiles } from "@/lib/geo";
import { SaveButton } from "@/components/SaveButton";
import { BuyBox } from "@/components/BuyBox";
import { StarRating } from "@/components/StarRating";
import type { Rating } from "@/lib/reviews";

function terms(listing: ListingWithOwner): string {
  if (listing.type === "price") return formatMoney(listing.price);
  if (listing.type === "bid") return `Bid from ${formatMoney(listing.startReserve)}`;
  return listing.tradeKind === "service" ? "Service swap" : "Goods swap";
}

/**
 * Commerce-style marketplace card (materialsmarket-inspired): photo + type badge,
 * title, location, price, an adaptive primary action (stepper for stockable
 * items), and the SELLER's overall star rating (or a "No reviews yet" empty
 * state). Buyer price only - never the seller net/margin.
 */
export function MarketplaceCard({
  listing,
  distanceMi,
  saved,
  currentCollectionId = null,
  collections = [],
  sellerRating,
}: {
  listing: ListingWithOwner;
  distanceMi?: number;
  saved?: boolean;
  currentCollectionId?: string | null;
  collections?: { id: string; name: string }[];
  /** The seller's overall rating, or null when they have no reviews yet. */
  sellerRating?: Rating | null;
}) {
  const badge = listingBadge(listing.type, listing.tradeKind);
  const photo = photosFromJson(listing.photos)[0];
  const owner = listingOwner(listing);
  const location = metroLabel(listing.city, listing.state);

  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:border-slate-300 hover:shadow-sm">
      {saved !== undefined && (
        <div className="absolute right-2 top-2 z-10">
          <SaveButton
            listingId={listing.id}
            saved={saved}
            currentCollectionId={currentCollectionId}
            collections={collections}
          />
        </div>
      )}

      <Link href={`/listings/${listing.id}`} className="block">
        <div className="relative aspect-[4/3] bg-slate-100">
          {photo ? (
            isVideoUrl(photo) ? (
              <>
                <video src={photo} muted className="h-full w-full object-cover" />
                <span className="absolute bottom-2 left-2 rounded bg-black/60 px-1.5 py-0.5 text-xs font-medium text-white">
                  ▶ video
                </span>
              </>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} alt={listing.title} className="h-full w-full object-cover" />
            )
          ) : (
            <div className="grid h-full w-full place-items-center text-slate-300">
              <span className="text-4xl">🏗️</span>
            </div>
          )}
          <span
            className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-xs font-semibold ${badge.tone}`}
          >
            {badge.label}
          </span>
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-3">
        <Link href={`/listings/${listing.id}`}>
          <p className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold text-slate-900 group-hover:text-brand-700">
            {listing.title}
          </p>
        </Link>

        <div className="mt-1.5 flex min-h-[1.25rem] flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
          <span className="rounded-full border border-slate-200 px-2 py-0.5 font-medium text-slate-600">
            {tradeLabel(listing.tradeCategory)}
          </span>
          {location && <span>📍 {location}</span>}
          {distanceMi !== undefined && (
            <span className="font-medium text-brand-700">
              ~{formatMiles(distanceMi)}
            </span>
          )}
        </div>

        <p className="mt-2 text-base font-bold text-slate-900">{terms(listing)}</p>

        {/* Adaptive primary action - pinned to the bottom so the buttons line up
            across every card in the row regardless of title/stepper height. */}
        <div className="mt-auto pt-3">
          <BuyBox
            listingId={listing.id}
            type={listing.type}
            quantityAvailable={listing.quantityAvailable}
          />
        </div>

        {/* Seller block (fixed two-line height -> aligned across cards) */}
        {owner && (
          <div className="mt-3 border-t border-slate-100 pt-2">
            <Link
              href={owner.href}
              className="block truncate text-xs font-medium text-slate-700 hover:underline"
            >
              {owner.name}
            </Link>
            <div className="mt-0.5 h-5">
              {sellerRating && sellerRating.count > 0 ? (
                <StarRating rating={sellerRating.avg} count={sellerRating.count} />
              ) : (
                <span className="text-xs text-slate-400">No reviews yet</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
