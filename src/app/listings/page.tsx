import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { ListingCard } from "@/components/ListingCard";
import { SortSelect } from "@/components/SortSelect";
import { tradesByCategory } from "@/lib/trades";
import { LocationPicker } from "@/components/LocationPicker";
import { LISTING_CHOICES, ownerInclude, type ListingChoice } from "@/lib/listings";
import { haversineMiles, boundingBox } from "@/lib/geo";
import type { Prisma } from "@/generated/prisma/client";

type Search = {
  q?: string;
  trade?: string;
  type?: string;
  city?: string;
  state?: string;
  lat?: string;
  lng?: string;
  radius?: string;
  sort?: string;
};

const RADII = [10, 25, 50, 100, 250];

const SORTS = [
  { value: "", label: "Newest" },
  { value: "nearest", label: "Nearest" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
];

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

/** Sortable price: set-price uses price, bids use the starting bid, trades none. */
function priceOf(l: { price: unknown; startReserve: unknown }): number | null {
  const v = l.price ?? l.startReserve;
  return v == null ? null : Number(v);
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
  const type = (sp.type ?? "").trim();
  const city = (sp.city ?? "").trim();
  const state = (sp.state ?? "").trim();
  const sort = (sp.sort ?? "").trim();

  const lat = Number(sp.lat);
  const lng = Number(sp.lng);
  const radius = Number(sp.radius);
  const hasCenter =
    Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);
  const radiusActive =
    !!city && hasCenter && Number.isFinite(radius) && radius > 0;

  const baseWhere: Prisma.ListingWhereInput = {
    status: "active",
    ...(q ? { title: { contains: q } } : {}),
    ...(trade ? { tradeCategory: trade } : {}),
    ...(type ? typeWhere(type) : {}),
  };

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
      take: radiusActive ? 300 : 200,
    }),
    getCurrentUser(),
  ]);

  type Row = { listing: (typeof raw)[number]; distanceMi?: number };
  const rows: Row[] = radiusActive
    ? raw.flatMap((l) => {
        if (l.lat === null || l.lng === null) return [];
        const d = haversineMiles(lat, lng, l.lat, l.lng);
        return d <= radius ? [{ listing: l, distanceMi: d }] : [];
      })
    : raw.map((l) => ({ listing: l }));

  const effectiveSort = sort || (radiusActive ? "nearest" : "newest");
  const byNewest = (a: Row, b: Row) =>
    b.listing.createdAt.getTime() - a.listing.createdAt.getTime();
  const byPrice = (a: Row, b: Row, dir: 1 | -1) => {
    const pa = priceOf(a.listing);
    const pb = priceOf(b.listing);
    if (pa === null && pb === null) return byNewest(a, b);
    if (pa === null) return 1;
    if (pb === null) return -1;
    return (pa - pb) * dir;
  };
  if (effectiveSort === "nearest" && radiusActive) {
    rows.sort((a, b) => (a.distanceMi ?? Infinity) - (b.distanceMi ?? Infinity));
  } else if (effectiveSort === "price_asc") {
    rows.sort((a, b) => byPrice(a, b, 1));
  } else if (effectiveSort === "price_desc") {
    rows.sort((a, b) => byPrice(a, b, -1));
  } else {
    rows.sort(byNewest);
  }
  const visible = rows.slice(0, 60);

  // Active filters drive the collapsed/open state + the badge (search and sort
  // are separate controls, so they don't count here).
  const activeCount =
    (trade ? 1 : 0) + (type ? 1 : 0) + (city || state ? 1 : 0) + (radiusActive ? 1 : 0);
  const hasActiveFilters = activeCount > 0;
  const hasFilters = !!(q || trade || type || city || state || radiusActive || sort);
  const radiusNoCenter = !!sp.radius && !city;
  const centerLabel = city && state ? `${city}, ${state}` : city;
  const sortSelected = effectiveSort === "newest" ? "" : effectiveSort;

  const sortParams: Record<string, string | undefined> = {
    q,
    trade,
    type,
    city,
    state,
    lat: hasCenter ? String(lat) : "",
    lng: hasCenter ? String(lng) : "",
    radius: sp.radius ?? "",
  };

  const countText =
    visible.length === 0
      ? "No listings match."
      : radiusActive
        ? `${visible.length} listing${visible.length === 1 ? "" : "s"} within ${radius} mi of ${centerLabel}`
        : `${visible.length} listing${visible.length === 1 ? "" : "s"}`;

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

        {/* Search + filters (one GET form; sort lives separately, below). */}
        <form method="get" className="mt-6">
          <input type="hidden" name="sort" value={sort} />

          <div className="flex gap-2">
            <input
              name="q"
              defaultValue={q}
              placeholder="Search the marketplace (skid steer, rebar, crew…)"
              className="flex-1 rounded-md border border-slate-300 px-4 py-2.5 text-sm"
            />
            <button
              type="submit"
              className="rounded-md bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
            >
              Search
            </button>
          </div>

          <details
            open={hasActiveFilters}
            className="group mt-3 rounded-xl border border-slate-200 bg-slate-50"
          >
            <summary className="flex cursor-pointer select-none items-center justify-between px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 [&::-webkit-details-marker]:hidden">
              <span>
                Filters
                {activeCount > 0 && (
                  <span className="ml-2 rounded-full bg-brand-100 px-2 py-0.5 text-brand-800">
                    {activeCount} applied
                  </span>
                )}
              </span>
              <span className="text-slate-400 transition-transform group-open:rotate-180">
                ▾
              </span>
            </summary>

            <div className="px-4 pb-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
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
                  <LocationPicker
                    mode="filter"
                    defaultCity={city}
                    defaultState={state}
                    defaultLat={hasCenter ? lat : undefined}
                    defaultLng={hasCenter ? lng : undefined}
                  />
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
              </div>

              {radiusNoCenter && (
                <p className="mt-3 text-xs text-amber-600">
                  Pick a city above to use it as the center for distance search.
                </p>
              )}

              <div className="mt-3 flex items-center gap-2">
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
          </details>
        </form>

        {/* Results header: count (left) + sort (right). */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500">{countText}</p>
          {visible.length > 0 && (
            <SortSelect sort={sortSelected} options={SORTS} params={sortParams} />
          )}
        </div>

        {visible.length === 0 ? (
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
            {visible.map((row) => (
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
