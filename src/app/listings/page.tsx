import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { ListingCard } from "@/components/ListingCard";
import { tradesByCategory } from "@/lib/trades";
import { LocationPicker } from "@/components/LocationPicker";
import { LISTING_CHOICES, ownerInclude, type ListingChoice } from "@/lib/listings";
import { haversineMiles, boundingBox } from "@/lib/geo";
import type { Prisma } from "@/generated/prisma/client";

type Search = {
  q?: string;
  trade?: string;
  city?: string;
  state?: string;
  type?: string;
  lat?: string;
  lng?: string;
  radius?: string;
};

const RADII = [10, 25, 50, 100, 250];

/** Translate the four UI type choices into a Prisma where fragment. */
function typeWhere(choice: string): Prisma.ListingWhereInput {
  switch (choice as ListingChoice) {
    case "price":
      return { type: "price" };
    case "bid":
      return { type: "bid" };
    case "trade-goods":
      return { type: "trade", tradeKind: "goods" };
    case "trade-services":
      return { type: "trade", tradeKind: "service" };
    default:
      return {};
  }
}

const inputCls = "w-full rounded-md border border-slate-300 px-3 py-2 text-sm";

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const trade = (sp.trade ?? "").trim();
  const city = (sp.city ?? "").trim();
  const state = (sp.state ?? "").trim();
  const type = (sp.type ?? "").trim();

  const lat = Number(sp.lat);
  const lng = Number(sp.lng);
  const radius = Number(sp.radius);
  // Radius search needs a center: a chosen city (with its coordinates).
  const radiusActive =
    !!city &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Number.isFinite(radius) &&
    radius > 0;

  const baseWhere: Prisma.ListingWhereInput = {
    status: "active",
    ...(q ? { title: { contains: q } } : {}),
    ...(trade ? { tradeCategory: trade } : {}),
    ...(type ? typeWhere(type) : {}),
  };

  // With a radius, match by a lat/lng bounding box (cheap DB prefilter) and rank
  // by exact distance below. Otherwise match the city/state directly.
  const where: Prisma.ListingWhereInput = radiusActive
    ? (() => {
        const bb = boundingBox(lat, lng, radius);
        return {
          ...baseWhere,
          lat: { gte: bb.minLat, lte: bb.maxLat },
          lng: { gte: bb.minLng, lte: bb.maxLng },
        };
      })()
    : {
        ...baseWhere,
        ...(city ? { city: { contains: city } } : {}),
        ...(state ? { state: state.toUpperCase() } : {}),
      };

  const [raw, viewer] = await Promise.all([
    prisma.listing.findMany({
      where,
      include: ownerInclude,
      orderBy: { createdAt: "desc" },
      take: radiusActive ? 300 : 60,
    }),
    getCurrentUser(),
  ]);

  type Row = { listing: (typeof raw)[number]; distanceMi?: number };
  const rows: Row[] = radiusActive
    ? raw
        .flatMap((l) => {
          if (l.lat === null || l.lng === null) return [];
          const d = haversineMiles(lat, lng, l.lat, l.lng);
          return d <= radius ? [{ listing: l, distanceMi: d }] : [];
        })
        .sort((a, b) => (a.distanceMi ?? 0) - (b.distanceMi ?? 0))
        .slice(0, 60)
    : raw.map((l) => ({ listing: l }));

  const hasFilters = !!(q || trade || city || state || type || radiusActive);
  const radiusNoCenter = !!sp.radius && !city;
  const centerLabel = city && state ? `${city}, ${state}` : city;

  const countText =
    rows.length === 0
      ? "No listings match."
      : radiusActive
        ? `${rows.length} listing${rows.length === 1 ? "" : "s"} within ${radius} mi of ${centerLabel}`
        : `${rows.length} listing${rows.length === 1 ? "" : "s"}`;

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Marketplace
            </h1>
            <p className="text-sm text-slate-500">
              Buy, bid, and trade across every trade and location.
            </p>
          </div>
          <Link
            href={viewer ? "/listings/new" : "/signin?next=/listings/new"}
            className="rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
          >
            + List something
          </Link>
        </div>

        {/* Filters (GET form, shareable, server-rendered) */}
        <form
          method="get"
          className="mt-6 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-7"
        >
          <div className="lg:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Search
            </label>
            <input
              name="q"
              defaultValue={q}
              placeholder="Skid steer, rebar, crew…"
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Trade
            </label>
            <select name="trade" defaultValue={trade} className={inputCls}>
              <option value="">All trades</option>
              {tradesByCategory().map((g) => (
                <optgroup key={g.category} label={g.category}>
                  {g.trades.map((t) => (
                    <option key={t.slug} value={t.slug}>
                      {t.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Type
            </label>
            <select name="type" defaultValue={type} className={inputCls}>
              <option value="">Any type</option>
              {LISTING_CHOICES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="lg:col-span-2">
            <LocationPicker mode="filter" defaultCity={city} defaultState={state} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Distance
            </label>
            <select name="radius" defaultValue={sp.radius ?? ""} className={inputCls}>
              <option value="">Any distance</option>
              {RADII.map((r) => (
                <option key={r} value={r}>
                  Within {r} mi
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2 lg:col-span-7">
            {radiusNoCenter && (
              <p className="mb-2 text-xs text-amber-600">
                Pick a city above to use it as the center for distance search.
              </p>
            )}
            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
              >
                Apply filters
              </button>
              {hasFilters && (
                <Link
                  href="/listings"
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white"
                >
                  Clear
                </Link>
              )}
            </div>
          </div>
        </form>

        {/* Results */}
        <p className="mt-6 text-sm text-slate-500">{countText}</p>

        {rows.length === 0 ? (
          <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-500">
            {hasFilters ? (
              <>
                Nothing here yet.{" "}
                <Link href="/listings" className="font-semibold underline">
                  Clear filters
                </Link>{" "}
                or{" "}
                <Link
                  href={viewer ? "/listings/new" : "/signin?next=/listings/new"}
                  className="font-semibold underline"
                >
                  list something
                </Link>
                .
              </>
            ) : (
              <>
                The marketplace is empty.{" "}
                <Link
                  href={viewer ? "/listings/new" : "/signin?next=/listings/new"}
                  className="font-semibold underline"
                >
                  Be the first to list →
                </Link>
              </>
            )}
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {rows.map((row) => (
              <ListingCard
                key={row.listing.id}
                listing={row.listing}
                distanceMi={row.distanceMi}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
