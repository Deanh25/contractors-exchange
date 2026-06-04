import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { MarketplaceCard } from "@/components/MarketplaceCard";
import { SortSelect } from "@/components/SortSelect";
import { tradesByCategory, tradeLabel } from "@/lib/trades";
import { LocationPicker } from "@/components/LocationPicker";
import {
  LISTING_CHOICES,
  LISTING_CONDITIONS,
  conditionLabel,
  ownerInclude,
  type ListingChoice,
} from "@/lib/listings";
import { listingOwnerParty } from "@/lib/messaging";
import { haversineMiles, boundingBox } from "@/lib/geo";
import { getSavedMap, getViewerCollections } from "@/lib/saved";
import { getSellerRatings } from "@/lib/reviews";
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
  priceMin?: string;
  priceMax?: string;
  condition?: string;
  manufacturer?: string;
};

const CONDITION_VALUES = new Set(["new", "like_new", "good", "fair", "salvage"]);

const RADII = [10, 25, 50, 100, 250];
const SORTS = [
  { value: "", label: "Newest" },
  { value: "nearest", label: "Nearest" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
];
const TYPE_LABEL = new Map<string, string>(
  LISTING_CHOICES.map((c) => [c.value, c.label]),
);

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

function priceOf(l: { price: unknown; startReserve: unknown }): number | null {
  const v = l.price ?? l.startReserve;
  return v == null ? null : Number(v);
}

/** Build a /listings URL from the current params, dropping the omitted keys. */
function buildQuery(params: Record<string, string>, omit: string[] = []): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v && !omit.includes(k)) usp.set(k, v);
  }
  const s = usp.toString();
  return s ? `/listings?${s}` : "/listings";
}

/** Hidden inputs so a form preserves params it doesn't directly edit. */
function HiddenParams({ params }: { params: Record<string, string> }) {
  return (
    <>
      {Object.entries(params).map(([k, v]) =>
        v ? <input key={k} type="hidden" name={k} value={v} /> : null,
      )}
    </>
  );
}

const inputCls = "w-full rounded-md border border-slate-300 px-3 py-2 text-sm";

/** A collapsible filter group in the navy rail. */
function FilterGroup({
  label,
  open = false,
  children,
}: {
  label: string;
  open?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details open={open} className="group border-b border-white/10 last:border-0">
      <summary className="flex cursor-pointer list-none items-center justify-between py-2.5 text-sm font-medium text-white">
        {label}
        <svg
          className="h-4 w-4 text-white/60 transition-transform group-open:rotate-180"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.25"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </summary>
      <div className="mb-2 rounded-md bg-white p-3 text-slate-700">{children}</div>
    </details>
  );
}

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
  const radiusActive = !!city && hasCenter && Number.isFinite(radius) && radius > 0;

  const priceMinNum = Number(sp.priceMin);
  const priceMaxNum = Number(sp.priceMax);
  const priceFilter: { gte?: number; lte?: number } = {};
  if (Number.isFinite(priceMinNum) && priceMinNum > 0) priceFilter.gte = priceMinNum;
  if (Number.isFinite(priceMaxNum) && priceMaxNum > 0) priceFilter.lte = priceMaxNum;
  const hasPriceFilter = priceFilter.gte !== undefined || priceFilter.lte !== undefined;

  const condition = CONDITION_VALUES.has((sp.condition ?? "").trim())
    ? (sp.condition ?? "").trim()
    : "";
  const manufacturer = (sp.manufacturer ?? "").trim();

  const baseWhere: Prisma.ListingWhereInput = {
    status: "active",
    ...(q ? { title: { contains: q } } : {}),
    ...(trade ? { tradeCategory: trade } : {}),
    ...(type ? typeWhere(type) : {}),
    ...(hasPriceFilter ? { price: priceFilter } : {}),
    ...(condition ? { condition: condition as Prisma.ListingWhereInput["condition"] } : {}),
    ...(manufacturer ? { manufacturer: { contains: manufacturer } } : {}),
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

  // Viewer saves + the sellers' overall ratings (batched) for the cards.
  const sellerParties = visible
    .map((r) => listingOwnerParty(r.listing))
    .filter((p): p is { type: "user" | "company"; id: string } => p !== null);
  const [savedMap, collections, sellerRatings, mfrRows] = await Promise.all([
    getSavedMap(viewer?.id),
    getViewerCollections(viewer?.id),
    getSellerRatings(sellerParties),
    prisma.listing.findMany({
      where: { status: "active", manufacturer: { not: null } },
      select: { manufacturer: true },
      distinct: ["manufacturer"],
      orderBy: { manufacturer: "asc" },
    }),
  ]);
  const manufacturers = mfrRows
    .map((m) => m.manufacturer)
    .filter((m): m is string => !!m);

  const latStr = hasCenter ? String(lat) : "";
  const lngStr = hasCenter ? String(lng) : "";
  const radiusStr = sp.radius ?? "";
  const priceMinStr = sp.priceMin ?? "";
  const priceMaxStr = sp.priceMax ?? "";
  const allParams: Record<string, string> = {
    q,
    trade,
    type,
    city,
    state,
    lat: latStr,
    lng: lngStr,
    radius: radiusStr,
    sort,
    priceMin: priceMinStr,
    priceMax: priceMaxStr,
    condition,
    manufacturer,
  };

  const activeCount =
    (trade ? 1 : 0) +
    (type ? 1 : 0) +
    (city || state ? 1 : 0) +
    (radiusActive ? 1 : 0) +
    (hasPriceFilter ? 1 : 0) +
    (condition ? 1 : 0) +
    (manufacturer ? 1 : 0);
  const hasAnything = activeCount > 0 || !!q || !!sort;
  const radiusNoCenter = !!sp.radius && !city;
  const centerLabel = city && state ? `${city}, ${state}` : city || state;
  const sortSelected = effectiveSort === "newest" ? "" : effectiveSort;

  // Removable active-filter chips.
  const chips: { key: string; label: string; href: string }[] = [];
  if (q) chips.push({ key: "q", label: `"${q}"`, href: buildQuery(allParams, ["q"]) });
  if (trade)
    chips.push({ key: "trade", label: tradeLabel(trade), href: buildQuery(allParams, ["trade"]) });
  if (type)
    chips.push({
      key: "type",
      label: TYPE_LABEL.get(type) ?? type,
      href: buildQuery(allParams, ["type"]),
    });
  if (city || state)
    chips.push({
      key: "loc",
      label: centerLabel,
      href: buildQuery(allParams, ["city", "state", "lat", "lng", "radius"]),
    });
  if (radiusActive)
    chips.push({ key: "radius", label: `Within ${radius} mi`, href: buildQuery(allParams, ["radius"]) });
  if (hasPriceFilter)
    chips.push({
      key: "price",
      label: `${priceMinStr ? `$${priceMinStr}` : "$0"} - ${priceMaxStr ? `$${priceMaxStr}` : "any"}`,
      href: buildQuery(allParams, ["priceMin", "priceMax"]),
    });
  if (condition)
    chips.push({
      key: "condition",
      label: conditionLabel(condition) ?? condition,
      href: buildQuery(allParams, ["condition"]),
    });
  if (manufacturer)
    chips.push({
      key: "manufacturer",
      label: manufacturer,
      href: buildQuery(allParams, ["manufacturer"]),
    });

  const heading = trade ? tradeLabel(trade) : "All listings";
  const countText = `${visible.length} listing${visible.length === 1 ? "" : "s"}`;

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[230px_1fr]">
          {/* ---- Navy filter rail ------------------------------------------ */}
          <aside className="lg:sticky lg:top-20 lg:self-start">
            <form
              method="get"
              className="rounded-xl bg-slate-900 p-4 text-white"
            >
              <HiddenParams params={{ q, sort }} />
              <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-white">
                Filters
              </h2>

              <FilterGroup label="Listing type" open={!!type}>
                <select name="type" defaultValue={type} className={inputCls}>
                  <option value="">Any type</option>
                  {LISTING_CHOICES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </FilterGroup>

              <FilterGroup label="Trade" open={!!trade}>
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
              </FilterGroup>

              <FilterGroup label="Location" open={!!city || radiusActive}>
                <LocationPicker
                  mode="filter"
                  defaultCity={city}
                  defaultState={state}
                  defaultLat={hasCenter ? lat : undefined}
                  defaultLng={hasCenter ? lng : undefined}
                />
                <label className="mb-1 mt-3 block text-xs font-medium text-slate-600">
                  Distance
                </label>
                <select name="radius" defaultValue={radiusStr} className={inputCls}>
                  <option value="">Any distance</option>
                  {RADII.map((r) => (
                    <option key={r} value={r}>
                      Within {r} mi
                    </option>
                  ))}
                </select>
                {radiusNoCenter && (
                  <p className="mt-2 text-xs text-amber-600">
                    Pick a city to use as the distance center.
                  </p>
                )}
              </FilterGroup>

              <FilterGroup label="Price" open={hasPriceFilter}>
                <div className="flex items-center gap-2">
                  <input
                    name="priceMin"
                    inputMode="decimal"
                    defaultValue={priceMinStr}
                    placeholder="Min"
                    className={inputCls}
                  />
                  <span className="text-slate-400">to</span>
                  <input
                    name="priceMax"
                    inputMode="decimal"
                    defaultValue={priceMaxStr}
                    placeholder="Max"
                    className={inputCls}
                  />
                </div>
              </FilterGroup>

              <FilterGroup label="Condition" open={!!condition}>
                <select name="condition" defaultValue={condition} className={inputCls}>
                  <option value="">Any condition</option>
                  {LISTING_CONDITIONS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </FilterGroup>

              <FilterGroup label="Manufacturer" open={!!manufacturer}>
                {manufacturers.length > 0 ? (
                  <select
                    name="manufacturer"
                    defaultValue={manufacturer}
                    className={inputCls}
                  >
                    <option value="">Any manufacturer</option>
                    {manufacturers.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    name="manufacturer"
                    defaultValue={manufacturer}
                    placeholder="Brand / make"
                    className={inputCls}
                  />
                )}
              </FilterGroup>

              <div className="mt-3 space-y-2">
                <button
                  type="submit"
                  className="w-full rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
                >
                  Apply filters
                </button>
                {hasAnything && (
                  <Link
                    href="/listings"
                    className="block text-center text-xs font-medium text-white/70 underline hover:text-white"
                  >
                    Clear all
                  </Link>
                )}
              </div>
            </form>
          </aside>

          {/* ---- Product column -------------------------------------------- */}
          <div className="min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  {heading}{" "}
                  <span className="text-base font-medium text-slate-400">
                    ({countText})
                  </span>
                </h1>
                <p className="text-sm text-slate-500">
                  Buy, bid, and exchange across every trade and location.
                </p>
              </div>
              <Link
                href={viewer ? "/listings/new" : "/signin?next=/listings/new"}
                className="rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
              >
                + List something
              </Link>
            </div>

            {/* Search + sort toolbar */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <form method="get" className="flex min-w-0 flex-1 gap-2">
                <HiddenParams
                  params={{
                    trade,
                    type,
                    city,
                    state,
                    lat: latStr,
                    lng: lngStr,
                    radius: radiusStr,
                    sort,
                    priceMin: priceMinStr,
                    priceMax: priceMaxStr,
                    condition,
                    manufacturer,
                  }}
                />
                <input
                  name="q"
                  defaultValue={q}
                  placeholder="Search the marketplace (skid steer, rebar, crew…)"
                  className="min-w-0 flex-1 rounded-md border border-slate-300 px-4 py-2 text-sm"
                />
                <button
                  type="submit"
                  className="rounded-md bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                >
                  Search
                </button>
              </form>
              <SortSelect
                sort={sortSelected}
                options={SORTS}
                params={{
                  q,
                  trade,
                  type,
                  city,
                  state,
                  lat: latStr,
                  lng: lngStr,
                  radius: radiusStr,
                  priceMin: priceMinStr,
                  priceMax: priceMaxStr,
                  condition,
                  manufacturer,
                }}
              />
            </div>

            {/* Active filter chips */}
            {chips.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {chips.map((c) => (
                  <Link
                    key={c.key}
                    href={c.href}
                    className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    {c.label}
                    <span className="text-slate-400" aria-hidden>
                      ✕
                    </span>
                  </Link>
                ))}
              </div>
            )}

            {/* Grid */}
            {visible.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-500">
                {hasAnything ? (
                  <>
                    Nothing matches.{" "}
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
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {visible.map((row) => {
                  const op = listingOwnerParty(row.listing);
                  const rating = op
                    ? sellerRatings.get(`${op.type}:${op.id}`) ?? null
                    : null;
                  return (
                    <MarketplaceCard
                      key={row.listing.id}
                      listing={row.listing}
                      distanceMi={row.distanceMi}
                      saved={viewer ? savedMap.has(row.listing.id) : undefined}
                      currentCollectionId={savedMap.get(row.listing.id) ?? null}
                      collections={collections}
                      sellerRating={rating}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
