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
import { timeAgo } from "@/lib/time";
import { SaveButton } from "@/components/SaveButton";

function terms(listing: ListingWithOwner): string {
  if (listing.type === "price") return formatMoney(listing.price);
  if (listing.type === "bid") return `Bid from ${formatMoney(listing.startReserve)}`;
  return listing.tradeKind === "service" ? "Service swap" : "Goods swap";
}

/** Horizontal listing card for the unified feed (vs. the grid ListingCard). */
export function FeedListingCard({
  listing,
  saved,
}: {
  listing: ListingWithOwner;
  /** Viewer's saved state; undefined hides the save button (logged-out). */
  saved?: boolean;
}) {
  const badge = listingBadge(listing.type, listing.tradeKind);
  const photo = photosFromJson(listing.photos)[0];
  const owner = listingOwner(listing);
  const location = metroLabel(listing.city, listing.state);

  return (
    <div className="relative">
      {saved !== undefined && (
        <div className="absolute right-3 top-3 z-10">
          <SaveButton listingId={listing.id} saved={saved} />
        </div>
      )}
      <Link
        href={`/listings/${listing.id}`}
        className="flex gap-4 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm"
      >
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-slate-100 sm:h-28 sm:w-28">
        {photo ? (
          isVideoUrl(photo) ? (
            <>
              <video src={photo} muted className="h-full w-full object-cover" />
              <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 text-[9px] font-medium text-white">
                ▶
              </span>
            </>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt={listing.title} className="h-full w-full object-cover" />
          )
        ) : (
          <div className="grid h-full w-full place-items-center text-3xl text-slate-300">
            🏗️
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 pr-9">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badge.tone}`}
          >
            {badge.label}
          </span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
            Listing
          </span>
          <span className="ml-auto text-xs text-slate-400">
            {timeAgo(listing.createdAt)}
          </span>
        </div>

        <p className="mt-1.5 line-clamp-2 text-sm font-semibold text-slate-900">
          {listing.title}
        </p>
        <p className="mt-0.5 text-sm font-bold text-slate-900">{terms(listing)}</p>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
          <span className="rounded-full border border-slate-200 px-2 py-0.5 font-medium text-slate-600">
            {tradeLabel(listing.tradeCategory)}
          </span>
          {location && <span>📍 {location}</span>}
          {owner && <span className="truncate">· {owner.name}</span>}
        </div>
      </div>
      </Link>
    </div>
  );
}
