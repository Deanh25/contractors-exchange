import Link from "next/link";
import { requireUser, getUserCompanies } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProfileHeader } from "@/components/ProfileHeader";
import { Avatar } from "@/components/Avatar";
import { ListingCard } from "@/components/ListingCard";
import { StarRating } from "@/components/StarRating";
import { WorkspaceShell } from "@/components/WorkspaceShell";
import { tradesFromJson } from "@/lib/trades";
import { ownerInclude } from "@/lib/listings";
import { getUserRating, getUserReviews } from "@/lib/reviews";
import { getSavedCount } from "@/lib/saved";
import { timeAgo } from "@/lib/time";

type Tab = "overview" | "companies" | "listings" | "reviews";
const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "companies", label: "Companies" },
  { key: "listings", label: "Listings" },
  { key: "reviews", label: "Reviews" },
];

function TabLink({
  tab,
  label,
  count,
  active,
}: {
  tab: Tab;
  label: string;
  count?: number;
  active: boolean;
}) {
  const href = tab === "overview" ? "/me" : `/me?tab=${tab}`;
  return (
    <Link
      href={href}
      className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-1 pb-2 text-sm font-medium transition ${
        active
          ? "border-brand-500 text-slate-900"
          : "border-transparent text-slate-500 hover:text-slate-800"
      }`}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span className="rounded-full bg-slate-100 px-1.5 text-xs font-semibold text-slate-500">
          {count}
        </span>
      )}
    </Link>
  );
}

export default async function MyProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await requireUser("/me");
  const sp = await searchParams;
  const tab: Tab = TABS.some((t) => t.key === sp.tab)
    ? (sp.tab as Tab)
    : "overview";

  const [memberships, listings, rating, reviews, savedCount] = await Promise.all([
    getUserCompanies(user.id),
    prisma.listing.findMany({
      where: { ownerUserId: user.id },
      include: ownerInclude,
      orderBy: { createdAt: "desc" },
    }),
    getUserRating(user.id),
    getUserReviews(user.id, 20),
    getSavedCount(user.id),
  ]);

  const incomplete =
    !user.title && !user.bio && tradesFromJson(user.trades).length === 0;

  return (
    <main className="flex-1">
      <WorkspaceShell user={user} active="profile" scope="personal">
        {/* Identity card (always shown) */}
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Your profile
            </span>
            <div className="flex gap-2">
              <Link
                href={`/u/${user.id}`}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                View public
              </Link>
              <Link
                href="/me/edit"
                className="rounded-md bg-brand-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-600"
              >
                Edit profile
              </Link>
            </div>
          </div>
          <ProfileHeader profile={user} />
          <div className="mt-3">
            <StarRating rating={rating.avg} count={rating.count} />
          </div>
          <p className="mt-4 text-xs text-slate-400">{user.email}</p>

          {incomplete && (
            <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Your profile is a bit empty.{" "}
              <Link href="/me/edit" className="font-semibold underline">
                Add your trades, location, and bio
              </Link>{" "}
              so others can find you.
            </p>
          )}
        </section>

        {/* Sub-section tabs */}
        <div className="mt-6 flex gap-5 overflow-x-auto border-b border-slate-200">
          {TABS.map((t) => (
            <TabLink
              key={t.key}
              tab={t.key}
              label={t.label}
              active={tab === t.key}
              count={
                t.key === "companies"
                  ? memberships.length
                  : t.key === "listings"
                    ? listings.length
                    : t.key === "reviews"
                      ? reviews.length
                      : undefined
              }
            />
          ))}
        </div>

        {/* Tab content */}
        {tab === "overview" && (
          <div className="mt-6 space-y-6">
            {/* Quick stats */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Listings" value={listings.length} href="/me?tab=listings" />
              <Stat label="Companies" value={memberships.length} href="/me?tab=companies" />
              <Stat label="Reviews" value={rating.count} href="/me?tab=reviews" />
              <Stat label="Saved" value={savedCount} href="/saved" />
            </div>

            {/* Recent listings preview */}
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Recent listings
                </h2>
                <Link href="/listings/new" className="text-sm font-medium text-brand-700 hover:underline">
                  + List something
                </Link>
              </div>
              {listings.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                  You haven&apos;t listed anything yet.{" "}
                  <Link href="/listings/new" className="font-semibold text-slate-700 underline">
                    Sell, auction, or trade →
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {listings.slice(0, 3).map((listing) => (
                    <ListingCard key={listing.id} listing={listing} />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {tab === "companies" && (
          <section className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Your companies
              </h2>
              <Link
                href="/company/new"
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                + Create company page
              </Link>
            </div>

            {memberships.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                You&apos;re not part of any company yet. A company page is an
                optional business storefront - you can sell, bid, and trade as
                yourself too.{" "}
                <Link href="/company/new" className="font-semibold text-slate-700 underline">
                  Create one →
                </Link>
              </div>
            ) : (
              <ul className="space-y-2">
                {memberships.map((m) => (
                  <li key={m.id}>
                    <Link
                      href={`/company/${m.company.slug}`}
                      className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 hover:bg-slate-50"
                    >
                      <Avatar name={m.company.name} src={m.company.logoUrl} size={40} rounded="md" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-slate-900">
                          {m.company.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {m.role === "owner" ? "Owner" : "Member"}
                        </p>
                      </div>
                      <span className="text-slate-400">→</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {tab === "listings" && (
          <section className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Your listings
              </h2>
              <Link
                href="/listings/new"
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                + List something
              </Link>
            </div>

            {listings.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                You haven&apos;t listed anything yet.{" "}
                <Link href="/listings/new" className="font-semibold text-slate-700 underline">
                  Sell, auction, or trade →
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {listings.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            )}
          </section>
        )}

        {tab === "reviews" && (
          <section className="mt-6">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Reviews about you
            </h2>
            {reviews.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                No reviews yet. Complete a deal on-platform and the other party
                can rate you.
              </div>
            ) : (
              <ul className="space-y-3">
                {reviews.map((r) => (
                  <li
                    key={r.id}
                    className="rounded-xl border border-slate-200 bg-white p-4"
                  >
                    <div className="flex items-center gap-3">
                      <Link href={`/u/${r.raterId}`}>
                        <Avatar name={r.rater.name} src={r.rater.avatarUrl} size={36} />
                      </Link>
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/u/${r.raterId}`}
                          className="truncate font-medium text-slate-900 hover:underline"
                        >
                          {r.rater.name}
                        </Link>
                        <div className="flex items-center gap-2">
                          <StarRating rating={r.stars} showNumber={false} />
                          <span className="text-xs text-slate-400">
                            {timeAgo(r.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                    {r.transaction?.listing && (
                      <Link
                        href={`/listings/${r.transaction.listing.id}`}
                        className="mt-2 inline-block max-w-full truncate rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 hover:bg-slate-200"
                      >
                        Deal: {r.transaction.listing.title}
                      </Link>
                    )}
                    {r.body && (
                      <p className="mt-2 whitespace-pre-line text-sm text-slate-700">
                        {r.body}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </WorkspaceShell>
    </main>
  );
}

function Stat({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-slate-200 bg-white p-4 text-center transition hover:border-slate-300 hover:bg-slate-50"
    >
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs font-medium text-slate-500">{label}</p>
    </Link>
  );
}
