import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getUserCompanies } from "@/lib/auth";
import { PostComposer } from "@/components/PostComposer";
import { PostCard } from "@/components/PostCard";
import { FeedListingCard } from "@/components/FeedListingCard";
import { FollowButton } from "@/components/FollowButton";
import { TRADES, tradeLabel } from "@/lib/trades";
import { authorInclude } from "@/lib/posts";
import { ownerInclude } from "@/lib/listings";
import {
  getFollowSets,
  hasAnyFollows,
  listingFollowFilter,
  postFollowFilter,
  type FollowSets,
} from "@/lib/follows";
import type { Prisma } from "@/generated/prisma/client";

const EMPTY: FollowSets = { trades: [], locations: [], companies: [], users: [] };

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string; trade?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const scope = sp.scope === "all" ? "all" : "following";
  const trade = (sp.trade ?? "").trim();

  const viewer = await getCurrentUser();
  const follows = viewer ? await getFollowSets(viewer.id) : EMPTY;
  const following = hasAnyFollows(follows);

  // Base feed = your follows; "All" or a not-yet-following user sees everything.
  const useFollowFilter = scope === "following" && following;

  const listingWhere: Prisma.ListingWhereInput = {
    status: "active",
    ...(useFollowFilter ? listingFollowFilter(follows) : {}),
    ...(trade ? { tradeCategory: trade } : {}),
  };
  const postWhere: Prisma.PostWhereInput = {
    ...(useFollowFilter ? postFollowFilter(follows) : {}),
    ...(trade ? { tradeTag: trade } : {}),
  };

  const [listings, posts, memberships] = await Promise.all([
    prisma.listing.findMany({
      where: listingWhere,
      include: ownerInclude,
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.post.findMany({
      where: postWhere,
      include: authorInclude,
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    viewer ? getUserCompanies(viewer.id) : Promise.resolve([]),
  ]);

  // Merge the two streams and sort reverse-chronologically (PRD §5 — no ranking).
  const items = [
    ...listings.map((l) => ({ kind: "listing" as const, at: l.createdAt, l })),
    ...posts.map((p) => ({ kind: "post" as const, at: p.createdAt, p })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 40);

  const ownedCompanies = memberships
    .filter((m) => m.role === "owner")
    .map((m) => ({ id: m.company.id, name: m.company.name }));

  const tabCls = (active: boolean) =>
    `rounded-md px-3 py-1.5 text-sm font-medium ${
      active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
    }`;

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
          {/* ── Main column ─────────────────────────────────────────────── */}
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
                companies={ownedCompanies}
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

            {/* Active trade filter */}
            {trade && (
              <div className="mt-4 flex items-center justify-between rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-600">
                <span>
                  Filtered to <strong>{tradeLabel(trade)}</strong>
                </span>
                <Link href="/feed" className="font-medium text-slate-700 underline">
                  Clear
                </Link>
              </div>
            )}

            {/* Items */}
            <div className="mt-4 space-y-4">
              {items.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-500">
                  {scope === "following" && following ? (
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
                    <FeedListingCard key={`l-${item.l.id}`} listing={item.l} />
                  ) : (
                    <PostCard key={`p-${item.p.id}`} post={item.p} />
                  ),
                )
              )}
            </div>
          </div>

          {/* ── Sidebar ─────────────────────────────────────────────────── */}
          <aside className="space-y-6">
            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="text-sm font-semibold text-slate-900">Follow trades</h2>
              <p className="mt-1 text-xs text-slate-500">
                Tap a trade to add it to your feed.
              </p>
              {viewer ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {TRADES.map((t) => (
                    <FollowButton
                      key={t.slug}
                      targetType="trade"
                      targetValue={t.slug}
                      following={follows.trades.includes(t.slug)}
                      path="/feed"
                      label={t.label}
                      pill
                    />
                  ))}
                </div>
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
