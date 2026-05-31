import Link from "next/link";
import {
  formatMoney,
  listingBadge,
  photosFromJson,
  listingOwner,
  type ListingWithOwner,
} from "@/lib/listings";
import { tradeLabel } from "@/lib/trades";
import { metroLabel } from "@/lib/locations";
import { formatMiles } from "@/lib/geo";

/** A short line describing the price/terms for the listing's type. */
function terms(listing: ListingWithOwner): string {
  if (listing.type === "price") return formatMoney(listing.price);
  if (listing.type === "bid") return `Bid from ${formatMoney(listing.startReserve)}`;
  return listing.tradeKind === "service" ? "Service swap" : "Goods swap";
}

export function ListingCard({
  listing,
  distanceMi,
}: {
  listing: ListingWithOwner;
  distanceMi?: number;
}) {
  const badge = listingBadge(listing.type, listing.tradeKind);
  const photo = photosFromJson(listing.photos)[0];
  const owner = listingOwner(listing);
  const location = metroLabel(listing.city, listing.state);

  return (
    <Link
      href={`/listings/${listing.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:border-slate-300 hover:shadow-sm"
    >
      <div className="relative aspect-[4/3] bg-slate-100">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt={listing.title}
            className="h-full w-full object-cover"
          />
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

      <div className="flex flex-1 flex-col p-3">
        <p className="line-clamp-2 text-sm font-semibold text-slate-900 group-hover:text-brand-700">
          {listing.title}
        </p>
        <p className="mt-1 text-sm font-bold text-slate-900">{terms(listing)}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
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
        {owner && (
          <p className="mt-2 truncate text-xs text-slate-400">{owner.name}</p>
        )}
      </div>
    </Link>
  );
}
