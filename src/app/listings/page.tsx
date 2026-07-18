import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { MarketplaceCard } from "@/components/MarketplaceCard";
import { SortSelect } from "@/components/SortSelect";
import { LocationPicker } from "@/components/LocationPicker";
import { FilterForm } from "@/components/marketplace/FilterForm";
import {
  RailGroup,
  CheckRow,
  TaxonomyFilter,
} from "@/components/marketplace/MarketplaceFilterUI";
import { getLeafGroups, getCategoryLabelMap } from "@/lib/categories";
import {
  PRODUCT_CATEGORIES,
  EQUIPMENT_CATEGORIES,
  isValidCategory,
  type TaxCategory,
} from "@/lib/taxonomy";
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
import type { Prisma, ListingCondition } from "@/generated/prisma/client";

type Search = Record<string, string | string[] | undefined>;

const CONDITION_VALUES = new Set(LISTING_CONDITIONS.map((c) => c.value));
const TYPE_VALUES = new Set(LISTING_CHOICES.map((c) => c.value));

const RADII = [10, 25, 50, 100, 250];
const SORTS = [
  { value: "", label: "Newest" },
  { value: "nearest", label: "Nearest" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
];
const TYPE_LABEL = new Map(LISTING_CHOICES.map((c) => [c.value, c.label]));

// Flat slug -> label maps for the active-filter chips (built once, module scope).
const CAT_LABEL = new Map<string, string>();
const SUB_LABEL = new Map<string, string>();
for (const tree of [PRODUCT_CATEGORIES, EQUIPMENT_CATEGORIES]) {
  for (const c of tree) {
    CAT_LABEL.set(c.slug, c.label);
    for (const s of c.subcategories) SUB_LABEL.set(s.slug, s.label);
  }
}
const VALID_SUBS = new Set(SUB_LABEL.keys());

/** Normalize a searchParams value to a trimmed string[] (repeated keys -> array). */
function arr(v: string | string[] | undefined): string[] {
  const list = Array.isArray(v) ? v : v ? [v] : [];
  return list.map((s) => s.trim()).filter(Boolean);
}
/** First value of a (possibly repeated) param, trimmed. */
function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v ?? "").trim();
}

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

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;

  const q = one(sp.q);
  const sort = one(sp.sort);
  const priceMinStr = one(sp.priceMin);
  const priceMaxStr = one(sp.priceMax);

  // Location (single center for radius search + coarse state/city filter).
  const city = one(sp.city);
  const state = one(sp.state).toUpperCase();
  const lat = Number(one(sp.lat));
  const lng = Number(one(sp.lng));
  const radius = Number(one(sp.radius));
  const hasCenter =
    Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);
  const radiusActive = !!city && hasCenter && Number.isFinite(radius) && radius > 0;

  // Multi-select facets (checkbox groups), each validated against its vocabulary.
  const types = arr(sp.type).filter((t) => TYPE_VALUES.has(t as ListingChoice));
  const conditions = arr(sp.condition).filter((c) => CONDITION_VALUES.has(c));
  const manufacturers = arr(sp.manufacturer);
  const trades = arr(sp.trade);
  const cats = arr(sp.cat).filter(
    (c) => isValidCategory("product", c) || isValidCategory("equipment", c),
  );
  const subs = arr(sp.sub).filter((s) => VALID_SUBS.has(s));

  const priceMinNum = Number(priceMinStr);
  const priceMaxNum = Number(priceMaxStr);
  const priceFilter: { gte?: number; lte?: number } = {};
  if (Number.isFinite(priceMinNum) && priceMinNum > 0) priceFilter.gte = priceMinNum;
  if (Number.isFinite(priceMaxNum) && priceMaxNum > 0) priceFilter.lte = priceMaxNum;
  const hasPriceFilter = priceFilter.gte !== undefined || priceFilter.lte !== undefined;

  // OR-groups can't share one `where` key, so they go under AND.
  const and: Prisma.ListingWhereInput[] = [];
  if (types.length) and.push({ OR: types.map(typeWhere) });
  const taxOr: Prisma.ListingWhereInput[] = [];
  if (cats.length) taxOr.push({ categorySlug: { in: cats } });
  if (subs.length) taxOr.push({ subcategorySlug: { in: subs } });
  if (taxOr.length) and.push({ OR: taxOr });

  const baseWhere: Prisma.ListingWhereInput = {
    status: "active",
    ...(q ? { title: { contains: q } } : {}),
    ...(trades.length ? { tradeCategory: { in: trades } } : {}),
    ...(conditions.length ? { condition: { in: conditions as ListingCondition[] } } : {}),
    ...(manufacturers.length ? { manufacturer: { in: manufacturers } } : {}),
    ...(hasPriceFilter ? { price: priceFilter } : {}),
    ...(and.length ? { AND: and } : {}),
  };

  // When a radius is active, pre-filter to the bounding box in SQL, then refine
  // by exact great-circle distance below. Otherwise fall back to city/state text.
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
        ...(state ? { state } : {}),
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
  const [savedMap, collections, sellerRatings, mfrRows, leafGroups, catLabels] =
    await Promise.all([
      getSavedMap(viewer?.id),
      getViewerCollections(viewer?.id),
      getSellerRatings(sellerParties),
      prisma.listing.findMany({
        where: { status: "active", manufacturer: { not: null } },
        select: { manufacturer: true },
        distinct: ["manufacturer"],
        orderBy: { manufacturer: "asc" },
      }),
      getLeafGroups(),
      getCategoryLabelMap(),
    ]);
  const manufacturers_all = mfrRows
    .map((m) => m.manufacturer)
    .filter((m): m is string => !!m);

  const catSet = new Set(cats);
  const subSet = new Set(subs);
  const latStr = hasCenter ? String(lat) : "";
  const lngStr = hasCenter ? String(lng) : "";
  const radiusStr = one(sp.radius);
  const centerLabel = city && state ? `${city}, ${state}` : city || state;
  const radiusNoCenter = !!radiusStr && !city;

  // ---- Active-filter chips + URLs (reserved row so the grid never jumps) -------
  function currentUSP(): URLSearchParams {
    const u = new URLSearchParams();
    if (q) u.set("q", q);
    for (const t of types) u.append("type", t);
    for (const c of conditions) u.append("condition", c);
    for (const m of manufacturers) u.append("manufacturer", m);
    for (const t of trades) u.append("trade", t);
    for (const c of cats) u.append("cat", c);
    for (const s of subs) u.append("sub", s);
    if (city) u.set("city", city);
    if (state) u.set("state", state);
    if (latStr) u.set("lat", latStr);
    if (lngStr) u.set("lng", lngStr);
    if (radiusStr) u.set("radius", radiusStr);
    if (priceMinStr) u.set("priceMin", priceMinStr);
    if (priceMaxStr) u.set("priceMax", priceMaxStr);
    if (sort) u.set("sort", sort);
    return u;
  }
  function toHref(u: URLSearchParams): string {
    const s = u.toString();
    return s ? `/listings?${s}` : "/listings";
  }
  function hrefRemoving(key: string, value?: string): string {
    const u = currentUSP();
    if (value === undefined) {
      u.delete(key);
    } else {
      const rest = u.getAll(key).filter((v) => v !== value);
      u.delete(key);
      for (const v of rest) u.append(key, v);
    }
    return toHref(u);
  }
  function hrefRemovingKeys(keys: string[]): string {
    const u = currentUSP();
    for (const k of keys) u.delete(k);
    return toHref(u);
  }

  const chips: { key: string; label: string; href: string }[] = [];
  if (q) chips.push({ key: "q", label: `"${q}"`, href: hrefRemoving("q") });
  for (const t of types)
    chips.push({ key: `type-${t}`, label: TYPE_LABEL.get(t as ListingChoice) ?? t, href: hrefRemoving("type", t) });
  for (const c of cats)
    chips.push({ key: `cat-${c}`, label: CAT_LABEL.get(c) ?? c, href: hrefRemoving("cat", c) });
  for (const s of subs)
    chips.push({ key: `sub-${s}`, label: SUB_LABEL.get(s) ?? s, href: hrefRemoving("sub", s) });
  for (const t of trades)
    chips.push({ key: `trade-${t}`, label: catLabels[t] ?? t, href: hrefRemoving("trade", t) });
  if (city || state)
    chips.push({
      key: "loc",
      label: centerLabel,
      href: hrefRemovingKeys(["city", "state", "lat", "lng", "radius"]),
    });
  if (radiusActive)
    chips.push({ key: "radius", label: `Within ${radius} mi`, href: hrefRemoving("radius") });
  for (const c of conditions)
    chips.push({ key: `cond-${c}`, label: conditionLabel(c) ?? c, href: hrefRemoving("condition", c) });
  for (const m of manufacturers)
    chips.push({ key: `mfr-${m}`, label: m, href: hrefRemoving("manufacturer", m) });
  if (hasPriceFilter)
    chips.push({
      key: "price",
      label: `${priceMinStr ? `$${priceMinStr}` : "$0"} - ${priceMaxStr ? `$${priceMaxStr}` : "any"}`,
      href: hrefRemovingKeys(["priceMin", "priceMax"]),
    });

  const activeCount =
    types.length + conditions.length + manufacturers.length + trades.length +
    cats.length + subs.length + (city || state ? 1 : 0) + (radiusActive ? 1 : 0) +
    (hasPriceFilter ? 1 : 0);
  const hasAnything = activeCount > 0 || !!q || !!sort;

  // Carry the other forms' params as hidden inputs (search box + sort own their key).
  const carryFor = (owned: string[]): Record<string, string | string[]> => {
    const p: Record<string, string | string[]> = {
      type: types, condition: conditions, manufacturer: manufacturers,
      trade: trades, cat: cats, sub: subs,
    };
    if (city) p.city = city;
    if (state) p.state = state;
    if (latStr) p.lat = latStr;
    if (lngStr) p.lng = lngStr;
    if (radiusStr) p.radius = radiusStr;
    if (priceMinStr) p.priceMin = priceMinStr;
    if (priceMaxStr) p.priceMax = priceMaxStr;
    if (q) p.q = q;
    if (sort) p.sort = sort;
    for (const k of owned) delete p[k];
    return p;
  };

  const crumbLabels = [
    ...cats.map((c) => CAT_LABEL.get(c) ?? c),
    ...subs.map((s) => SUB_LABEL.get(s) ?? s),
  ];
  const crumb = crumbLabels.length ? crumbLabels.join(" · ") : "All listings";
  const countText = `${visible.length} listing${visible.length === 1 ? "" : "s"}`;
  const sortSelected = effectiveSort === "newest" ? "" : effectiveSort;

  const productsOpen = PRODUCT_CATEGORIES.some(
    (c) => catSet.has(c.slug) || c.subcategories.some((s) => subSet.has(s.slug)),
  );
  const equipmentOpen = EQUIPMENT_CATEGORIES.some(
    (c) => catSet.has(c.slug) || c.subcategories.some((s) => subSet.has(s.slug)),
  );

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          {/* ---- Navy filter rail (instant apply, no Apply button) ----------- */}
          <aside className="lg:sticky lg:top-20 lg:self-start">
            <FilterForm className="overflow-hidden rounded-2xl bg-slate-900 text-white shadow-sm">
              {/* q + sort ride along so a filter change preserves them. */}
              {q && <input type="hidden" name="q" value={q} />}
              {sort && <input type="hidden" name="sort" value={sort} />}

              <div className="border-b border-white/10 px-5 pb-3 pt-4 text-xs font-bold uppercase tracking-[0.13em] text-white/50">
                Filters
              </div>

              <RailGroup label="Listing type" open={types.length > 0}>
                {LISTING_CHOICES.map((c) => (
                  <CheckRow
                    key={c.value}
                    name="type"
                    value={c.value}
                    label={c.label}
                    checked={types.includes(c.value)}
                  />
                ))}
              </RailGroup>

              <RailGroup label="Products / Materials" open={productsOpen}>
                <TaxonomyFilter
                  categories={PRODUCT_CATEGORIES as TaxCategory[]}
                  selectedCats={catSet}
                  selectedSubs={subSet}
                />
              </RailGroup>

              <RailGroup label="Equipment" open={equipmentOpen}>
                <TaxonomyFilter
                  categories={EQUIPMENT_CATEGORIES as TaxCategory[]}
                  selectedCats={catSet}
                  selectedSubs={subSet}
                />
              </RailGroup>

              <RailGroup label="Trade" open={trades.length > 0}>
                <div className="max-h-72 overflow-y-auto">
                  {leafGroups.map((g) => (
                    <div key={g.category} className="mb-2">
                      <p className="px-0.5 py-1 text-xs font-semibold uppercase tracking-wide text-white/40">
                        {g.category}
                      </p>
                      {g.leaves.map((l) => (
                        <CheckRow
                          key={l.slug}
                          name="trade"
                          value={l.slug}
                          label={l.label}
                          checked={trades.includes(l.slug)}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </RailGroup>

              {/* Location + distance search sits on a white panel so the linked
                  state/city control and radius stay legible on the navy rail. */}
              <RailGroup label="Location & distance" open={!!city || radiusActive}>
                <div className="rounded-lg bg-white p-3 text-slate-700">
                  <LocationPicker
                    mode="filter"
                    submitOnChange
                    defaultCity={city}
                    defaultState={state}
                    defaultLat={hasCenter ? lat : undefined}
                    defaultLng={hasCenter ? lng : undefined}
                  />
                  <label className="mb-1 mt-3 block text-xs font-medium text-slate-600">
                    Distance from that city
                  </label>
                  <select
                    name="radius"
                    defaultValue={radiusStr}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="">Any distance</option>
                    {RADII.map((r) => (
                      <option key={r} value={r}>
                        Within {r} mi
                      </option>
                    ))}
                  </select>
                  {radiusNoCenter && (
                    <p className="mt-2 text-xs text-amber-600">
                      Pick a city above to use as the distance center.
                    </p>
                  )}
                </div>
              </RailGroup>

              <RailGroup label="Price" open={hasPriceFilter}>
                <div className="flex items-center gap-2">
                  <input
                    name="priceMin"
                    inputMode="numeric"
                    defaultValue={priceMinStr}
                    placeholder="Min $"
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40"
                  />
                  <span className="text-white/40">–</span>
                  <input
                    name="priceMax"
                    inputMode="numeric"
                    defaultValue={priceMaxStr}
                    placeholder="Max $"
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40"
                  />
                </div>
              </RailGroup>

              <RailGroup label="Condition" open={conditions.length > 0}>
                {LISTING_CONDITIONS.map((c) => (
                  <CheckRow
                    key={c.value}
                    name="condition"
                    value={c.value}
                    label={c.label}
                    checked={conditions.includes(c.value)}
                  />
                ))}
              </RailGroup>

              {manufacturers_all.length > 0 && (
                <RailGroup label="Manufacturer" open={manufacturers.length > 0}>
                  <div className="max-h-72 overflow-y-auto">
                    {manufacturers_all.map((m) => (
                      <CheckRow
                        key={m}
                        name="manufacturer"
                        value={m}
                        label={m}
                        checked={manufacturers.includes(m)}
                      />
                    ))}
                  </div>
                </RailGroup>
              )}

              {/* No-JS fallback: without the client interceptor, this submits. */}
              <noscript>
                <div className="p-4">
                  <button className="w-full rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-white">
                    Apply filters
                  </button>
                </div>
              </noscript>
            </FilterForm>
          </aside>

          {/* ---- Results column --------------------------------------------- */}
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-slate-400">{crumb}</p>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Marketplace{" "}
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
                {Object.entries(carryFor(["q"])).flatMap(([k, v]) =>
                  (Array.isArray(v) ? v : [v]).map((val, i) => (
                    <input key={`${k}-${i}`} type="hidden" name={k} value={val} />
                  )),
                )}
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
              <SortSelect sort={sortSelected} options={SORTS} params={carryFor(["sort"])} />
            </div>

            {/* Active filter chips - row is always reserved so the grid never jumps */}
            <div className="mt-3 flex min-h-[34px] flex-wrap items-center gap-2">
              {chips.length === 0 ? (
                <span className="text-[13px] text-slate-400">
                  No filters applied - browse everything, or narrow it down on the left.
                </span>
              ) : (
                <>
                  {chips.map((c) => (
                    <Link
                      key={c.key}
                      href={c.href}
                      scroll={false}
                      className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-800 hover:bg-brand-100"
                    >
                      {c.label}
                      <span className="text-brand-500" aria-hidden>
                        ✕
                      </span>
                    </Link>
                  ))}
                  {hasAnything && (
                    <Link
                      href="/listings"
                      className="ml-1 text-xs font-bold text-slate-500 underline underline-offset-2 hover:text-slate-700"
                    >
                      Clear all
                    </Link>
                  )}
                </>
              )}
            </div>

            {/* Grid */}
            {visible.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-500">
                {hasAnything ? (
                  <>
                    No listings match those filters.{" "}
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
