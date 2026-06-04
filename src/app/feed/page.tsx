import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { PostComposer } from "@/components/PostComposer";
import { PostCard } from "@/components/PostCard";
import { FeedListingCard } from "@/components/FeedListingCard";
import { FollowButton } from "@/components/FollowButton";
import { toggleFollowAction } from "@/app/actions/follow";
import { tradeLabel, tradesByCategory } from "@/lib/trades";
import { authorInclude } from "@/lib/posts";
import { ownerInclude } from "@/lib/listings";
import { getSavedMap, getViewerCollections } from "@/lib/saved";
import { getActingCompanies, getActingContext } from "@/lib/identity";
import {
  getFollowSets,
  hasAnyFollows,
  listingFollowFilter,
  postFollowFilter,
  type FollowSets,
} from "@/lib/follows";
import type { Prisma } from "@/generated/prisma/client";

const EMPTY: FollowSets = { trades: [], locations: [], companies: [], users: [] };
type Show = "all" | "listings" | "posts";

/** Build a /feed URL from the current params, dropping omitted keys. */
function feedQuery(
  base: { scope: string; trade: string; q: string; show: Show },
  omit: string[] = [],
): string {
  const usp = new URLSearchParams();
  if (base.scope === "all" && !omit.includes("scope")) usp.set("scope", "all");
  if (base.trade && !omit.includes("trade")) usp.set("trade", base.trade);
  if (base.q && !omit.includes("q")) usp.set("q", base.q);
  if (base.show !== "all" && !omit.includes("show")) usp.set("show", base.show);
  const s = usp.toString();
  return s ? `/feed?${s}` : "/feed";
}

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{
    scope?: string;
    trade?: string;
    q?: string;
    show?: string;
    error?: string;
  }>;
}) {
  const sp = await searchParams;
  const scope = sp.scope === "all" ? "all" : "following";
  const trade = (sp.trade ?? "").trim();
  const q = (sp.q ?? "").trim();
  const show: Show =
    sp.show === "listings" ? "listings" : sp.show === "posts" ? "posts" : "all";

  const viewer = await getCurrentUser();
  const follows = viewer ? await getFollowSets(viewer.id) : EMPTY;
  const following = hasAnyFollows(follows);

  // Base feed = your follows; "All" or a not-yet-following user sees everything.
  const useFollowFilter = scope === "following" && following;

  const listingWhere: Prisma.ListingWhereInput = {
    status: "active",
    ...(trade ? { tradeCategory: trade } : {}),
    ...(q ? { title: { contains: q } } : {}),
    ...(useFollowFilter ? listingFollowFilter(follows) : {}),
  };
  const postWhere: Prisma.PostWhereInput = {
    ...(useFollowFilter ? postFollowFilter(follows) : {}),
    ...(trade ? { tradeTag: trade } : {}),
    ...(q ? { body: { contains: q } } : {}),
  };

  const showListings = show !== "posts";
  const showPosts = show !== "listings";

  const [listings, posts, actingCompanies, actingCtx] = await Promise.all([
    showListings
      ? prisma.listing.findMany({
          where: listingWhere,
          include: ownerInclude,
          orderBy: { createdAt: "desc" },
          take: 30,
        })
      : Promise.resolve([]),
    showPosts
      ? prisma.post.findMany({
          where: postWhere,
          include: authorInclude,
          orderBy: { createdAt: "desc" },
          take: 30,
        })
      : Promise.resolve([]),
    viewer ? getActingCompanies(viewer.id) : Promise.resolve([]),
    viewer ? getActingContext(viewer.id) : Promise.resolve({ type: "user" as const }),
  ]);

  // Merge the two streams and sort reverse-chronologically (PRD §5 - no ranking).
  const items = [
    ...listings.map((l) => ({ kind: "listing" as const, at: l.createdAt, l })),
    ...posts.map((p) => ({ kind: "post" as const, at: p.createdAt, p })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 40);

  const [savedMap, collections] = await Promise.all([
    getSavedMap(viewer?.id),
    getViewerCollections(viewer?.id),
  ]);

  // Companies the viewer may post as (owner OR canActAsCompany), defaulting the
  // composer to the current acting-as context.
  const composerCompanies = actingCompanies.map((c) => ({
    id: c.id,
    name: c.name,
  }));
  const composerDefault =
    actingCtx.type === "company" ? actingCtx.company.id : "self";

  const tabCls = (active: boolean) =>
    `rounded-md px-3 py-1.5 text-sm font-medium ${
      active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
    }`;

  const base = { scope, trade, q, show };
  const segCls = (active: boolean) =>
    `rounded-md px-3 py-1 text-sm font-medium transition ${
      active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
    }`;

  // Removable active-filter chips (marketplace pattern).
  const chips: { key: string; label: string; href: string }[] = [];
  if (q) chips.push({ key: "q", label: `"${q}"`, href: feedQuery(base, ["q"]) });
  if (trade)
    chips.push({ key: "trade", label: tradeLabel(trade), href: feedQuery(base, ["trade"]) });
  if (show !== "all")
    chips.push({
      key: "show",
      label: show === "listings" ? "Listings only" : "Posts only",
      href: feedQuery(base, ["show"]),
    });
  const clearAllHref = scope === "all" ? "/feed?scope=all" : "/feed";

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
          {/* -- Main column ----------------------------------------------- */}
          <div className="min-w-0">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Feed
              </h1>
              {viewer && (
                <div className="flex gap-1 rounded-lg border border-slate-200 p-1">
                  <Link href="/feed" className={tabCls(scope === "following")}>
                    Following
                  </Link>
                  <Link href="/feed?scope=all" className={tabCls(scope === "all")}>
                    All
                  </Link>
                </div>
              )}
            </div>

            {/* Composer / sign-in prompt */}
            {viewer ? (
              <PostComposer
                userName={viewer.name}
                avatarUrl={viewer.avatarUrl}
                companies={composerCompanies}
                defaultOwner={composerDefault}
              />
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                <Link href="/signin?next=/feed" className="font-semibold text-brand-700 underline">
                  Sign in
                </Link>{" "}
                to post, follow trades, and tailor your feed.
              </div>
            )}

            {sp.error === "empty" && (
              <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Write something before posting.
              </p>
            )}

            {/* Onboarding nudge */}
            {viewer && !following && (
              <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50 p-4 text-sm text-brand-900">
                Your feed is showing everything right now.{" "}
                <Link href="/welcome" className="font-semibold underline">
                  Pick your trades &amp; area
                </Link>{" "}
                to make it relevant.
              </div>
            )}

            {/* Search + filters (marketplace pattern: search, segment, trade, chips) */}
            <div className="mt-4 space-y-3">
              <form method="get" className="flex flex-wrap gap-2">
                {scope === "all" && <input type="hidden" name="scope" value="all" />}
                {show !== "all" && <input type="hidden" name="show" value={show} />}
                <input
                  name="q"
                  defaultValue={q}
                  placeholder="Search the feed (posts and listings)…"
                  className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
                <select
                  name="trade"
                  defaultValue={trade}
                  className="rounded-md border border-slate-300 px-2 py-2 text-sm"
                >
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
                <button
                  type="submit"
                  className="rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
                >
                  Apply
                </button>
              </form>

              <div className="flex items-center justify-between gap-3">
                {/* Show segment: All / Listings / Posts */}
                <div className="inline-flex gap-1 rounded-lg bg-slate-100 p-1">
                  <Link href={feedQuery({ ...base, show: "all" }, [])} className={segCls(show === "all")}>
                    All
                  </Link>
                  <Link
                    href={feedQuery({ ...base, show: "listings" }, [])}
                    className={segCls(show === "listings")}
                  >
                    Listings
                  </Link>
                  <Link
                    href={feedQuery({ ...base, show: "posts" }, [])}
                    className={segCls(show === "posts")}
                  >
                    Posts
                  </Link>
                </div>
              </div>

              {/* Removable chips */}
              {chips.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
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
                  <Link
                    href={clearAllHref}
                    className="text-xs font-medium text-slate-500 underline hover:text-slate-700"
                  >
                    Clear all
                  </Link>
                </div>
              )}
            </div>

            {/* Items */}
            <div className="mt-4 space-y-4">
              {items.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-500">
                  {chips.length > 0 ? (
                    <>
                      Nothing matches these filters.{" "}
                      <Link href={clearAllHref} className="font-semibold underline">
                        Clear filters →
                      </Link>
                    </>
                  ) : scope === "following" && following ? (
                    <>
                      Nothing from who you follow yet.{" "}
                      <Link href="/feed?scope=all" className="font-semibold underline">
                        See all activity →
                      </Link>
                    </>
                  ) : (
                    <>
                      The feed is empty.{" "}
                      <Link href="/listings/new" className="font-semibold underline">
                        Post a listing
                      </Link>{" "}
                      to get it started.
                    </>
                  )}
                </div>
              ) : (
                items.map((item) =>
                  item.kind === "listing" ? (
                    <FeedListingCard
                      key={`l-${item.l.id}`}
                      listing={item.l}
                      saved={viewer ? savedMap.has(item.l.id) : undefined}
                      currentCollectionId={savedMap.get(item.l.id) ?? null}
                      collections={collections}
                    />
                  ) : (
                    <PostCard key={`p-${item.p.id}`} post={item.p} />
                  ),
                )
              )}
            </div>
          </div>

          {/* -- Sidebar --------------------------------------------------- */}
          <aside className="space-y-6">
            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="text-sm font-semibold text-slate-900">Trades you follow</h2>
              {viewer ? (
                <>
                  {follows.trades.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {follows.trades.map((slug) => (
                        <FollowButton
                          key={slug}
                          targetType="trade"
                          targetValue={slug}
                          following
                          path="/feed"
                          label={tradeLabel(slug)}
                          pill
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-slate-500">
                      You&apos;re not following any trades yet.
                    </p>
                  )}

                  <form action={toggleFollowAction} className="mt-3 flex gap-2">
                    <input type="hidden" name="targetType" value="trade" />
                    <input type="hidden" name="path" value="/feed" />
                    <select
                      name="targetValue"
                      defaultValue=""
                      required
                      className="min-w-0 flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                    >
                      <option value="" disabled>
                        Add a trade…
                      </option>
                      {tradesByCategory().map((g) => {
                        const avail = g.trades.filter(
                          (t) => !follows.trades.includes(t.slug),
                        );
                        if (avail.length === 0) return null;
                        return (
                          <optgroup key={g.category} label={g.category}>
                            {avail.map((t) => (
                              <option key={t.slug} value={t.slug}>
                                {t.label}
                              </option>
                            ))}
                          </optgroup>
                        );
                      })}
                    </select>
                    <button
                      type="submit"
                      className="rounded-md bg-brand-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-600"
                    >
                      Add
                    </button>
                  </form>
                  <p className="mt-2 text-xs text-slate-400">
                    Tap a trade above to unfollow.
                  </p>
                </>
              ) : (
                <p className="mt-3 text-xs text-slate-500">
                  <Link href="/signin?next=/feed" className="font-medium text-brand-700 underline">
                    Sign in
                  </Link>{" "}
                  to follow trades.
                </p>
              )}
            </section>

            {viewer && follows.locations.length > 0 && (
              <section className="rounded-xl border border-slate-200 bg-white p-4">
                <h2 className="text-sm font-semibold text-slate-900">Your areas</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {follows.locations.map((s) => (
                    <FollowButton
                      key={s}
                      targetType="location"
                      targetValue={s}
                      following
                      path="/feed"
                      label={`📍 ${s}`}
                      pill
                    />
                  ))}
                </div>
                <Link
                  href="/welcome"
                  className="mt-3 inline-block text-xs font-medium text-brand-700 underline"
                >
                  Edit trades &amp; areas
                </Link>
              </section>
            )}

            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="text-sm font-semibold text-slate-900">Browse</h2>
              <ul className="mt-2 space-y-1 text-sm">
                <li>
                  <Link href="/listings" className="text-brand-700 hover:underline">
                    → Marketplace
                  </Link>
                </li>
                <li>
                  <Link href="/listings/new" className="text-brand-700 hover:underline">
                    → List something
                  </Link>
                </li>
              </ul>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
