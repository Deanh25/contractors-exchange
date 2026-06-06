import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { Avatar } from "@/components/Avatar";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { tradesFromJson } from "@/lib/trades";
import { getCategoryLabelMap } from "@/lib/categories";
import { metroLabel } from "@/lib/locations";
import { ListingCard } from "@/components/ListingCard";
import { ownerInclude } from "@/lib/listings";
import { FollowButton } from "@/components/FollowButton";
import { StarRating } from "@/components/StarRating";
import { ReviewList } from "@/components/ReviewList";
import { WorkspaceShell } from "@/components/WorkspaceShell";
import { VerificationRequestCard } from "@/components/VerificationRequestCard";
import { messageCompanyAction } from "@/app/actions/message";
import { isFollowing, getFollowCounts } from "@/lib/follows";
import { getCompanyRating, getCompanyReviews } from "@/lib/reviews";
import { getActingContext } from "@/lib/identity";
import type { Party } from "@/lib/messaging";
import {
  inviteMemberAction,
  setMemberRoleAction,
  setMemberCanActAction,
  removeMemberAction,
} from "@/app/actions/team";

type Tab = "overview" | "storefront" | "team" | "reviews";

export default async function CompanyPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string; tab?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const [company, viewer] = await Promise.all([
    prisma.company.findUnique({
      where: { slug },
      include: {
        memberships: { include: { user: true }, orderBy: { createdAt: "asc" } },
      },
    }),
    getCurrentUser(),
  ]);

  if (!company) notFound();

  const [listings, rating, reviews, verifReq] = await Promise.all([
    prisma.listing.findMany({
      where: { ownerCompanyId: company.id, status: "active" },
      include: ownerInclude,
      orderBy: { createdAt: "desc" },
    }),
    getCompanyRating(company.id),
    getCompanyReviews(company.id),
    prisma.verificationRequest.findFirst({
      where: { companyId: company.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const trades = tradesFromJson(company.trades);
  const catLabels = await getCategoryLabelMap();
  const location = metroLabel(company.city, company.state);
  const isOwner = company.memberships.some(
    (m) => m.userId === viewer?.id && m.role === "owner",
  );
  const ctx = viewer ? await getActingContext(viewer.id) : { type: "user" as const };
  const actingAsThis = ctx.type === "company" && ctx.company.id === company.id;
  const viewerParty: Party | null = viewer
    ? ctx.type === "company"
      ? { type: "company", id: ctx.company.id }
      : { type: "user", id: viewer.id }
    : null;
  const followTarget: Party = { type: "company", id: company.id };
  const [followingCompany, followCounts] = await Promise.all([
    viewerParty && !isOwner && !actingAsThis
      ? isFollowing(viewerParty, followTarget)
      : Promise.resolve(false),
    getFollowCounts(followTarget),
  ]);

  const tab: Tab = (
    ["overview", "storefront", "team", "reviews"] as const
  ).includes(sp.tab as Tab)
    ? (sp.tab as Tab)
    : "overview";

  // ---- Reusable content sections (shared by workspace + public modes) -------

  const aboutBlock = (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
      <Avatar name={company.name} src={company.logoUrl} size={72} rounded="md" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {company.name}
          </h1>
          {company.verified && <VerifiedBadge />}
        </div>
        <div className="mt-1">
          <StarRating rating={rating.avg} count={rating.count} />
        </div>
        <div className="mt-2 flex gap-4 text-sm text-slate-600">
          <Link
            href={`/network?party=company:${company.id}&tab=followers`}
            className="hover:underline"
          >
            <span className="font-semibold text-slate-900">
              {followCounts.followers}
            </span>{" "}
            followers
          </Link>
          <Link
            href={`/network?party=company:${company.id}&tab=following`}
            className="hover:underline"
          >
            <span className="font-semibold text-slate-900">
              {followCounts.following}
            </span>{" "}
            following
          </Link>
        </div>
        {location && <p className="mt-1 text-sm text-slate-500">📍 {location}</p>}
        {company.serviceArea && (
          <p className="text-sm text-slate-500">Service area: {company.serviceArea}</p>
        )}
        {trades.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {trades.map((t) => (
              <span
                key={t}
                className="rounded-full border border-slate-300 bg-white px-2.5 py-0.5 text-xs font-medium text-slate-700"
              >
                {catLabels[t] ?? t}
              </span>
            ))}
          </div>
        )}
        {company.description && (
          <p className="mt-3 whitespace-pre-line text-sm text-slate-700">
            {company.description}
          </p>
        )}
      </div>
    </div>
  );

  const storefrontBlock = (
    <>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Storefront
        </h2>
        {isOwner && (
          <Link
            href="/listings/new"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            + New listing
          </Link>
        )}
      </div>
      {listings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
          {isOwner ? (
            <>
              No active listings yet.{" "}
              <Link href="/listings/new" className="font-semibold underline">
                Add the first →
              </Link>
            </>
          ) : (
            "No active listings yet."
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </>
  );

  const teamBlock = (
    <>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
        Team
      </h2>
      {isOwner && sp.error === "nouser" && (
        <p className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          No CX account uses that email yet. In v1 you can only add people who
          already have an account.
        </p>
      )}
      {isOwner && sp.error === "lastowner" && (
        <p className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          A company needs at least one owner.
        </p>
      )}
      <ul className="space-y-2">
        {company.memberships.map((m) => {
          const canAct = m.role === "owner" || m.canActAsCompany;
          return (
            <li
              key={m.id}
              className="rounded-xl border border-slate-200 bg-white p-3"
            >
              <div className="flex items-center gap-3">
                <Link href={`/u/${m.user.id}`} className="shrink-0">
                  <Avatar name={m.user.name} src={m.user.avatarUrl} size={40} />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/u/${m.user.id}`}
                    className="truncate font-medium text-slate-900 hover:underline"
                  >
                    {m.user.name}
                  </Link>
                  <p className="text-xs text-slate-500">
                    {m.role === "owner" ? "Owner" : "Member"}
                    {m.user.title ? ` · ${m.user.title}` : ""}
                  </p>
                </div>
                {canAct && (
                  <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                    Acts as company
                  </span>
                )}
              </div>
              {isOwner && (
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                  <form action={setMemberRoleAction}>
                    <input type="hidden" name="companyId" value={company.id} />
                    <input type="hidden" name="membershipId" value={m.id} />
                    <input
                      type="hidden"
                      name="role"
                      value={m.role === "owner" ? "member" : "owner"}
                    />
                    <button
                      type="submit"
                      className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      {m.role === "owner" ? "Make member" : "Make owner"}
                    </button>
                  </form>
                  {m.role !== "owner" && (
                    <form action={setMemberCanActAction}>
                      <input type="hidden" name="companyId" value={company.id} />
                      <input type="hidden" name="membershipId" value={m.id} />
                      <input
                        type="hidden"
                        name="value"
                        value={m.canActAsCompany ? "0" : "1"}
                      />
                      <button
                        type="submit"
                        className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        {m.canActAsCompany
                          ? "Revoke acting"
                          : "Allow acting as company"}
                      </button>
                    </form>
                  )}
                  <form action={removeMemberAction} className="ml-auto">
                    <input type="hidden" name="companyId" value={company.id} />
                    <input type="hidden" name="membershipId" value={m.id} />
                    <button
                      type="submit"
                      className="rounded-md px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </form>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {isOwner && (
        <form
          action={inviteMemberAction}
          className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3"
        >
          <input type="hidden" name="companyId" value={company.id} />
          <input
            name="email"
            type="email"
            required
            placeholder="Teammate's CX email…"
            className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <button
            type="submit"
            className="shrink-0 rounded-md bg-brand-500 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-600"
          >
            Add to team
          </button>
        </form>
      )}
    </>
  );

  const reviewsBlock = (
    <>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
        Reviews
      </h2>
      <ReviewList reviews={reviews} />
    </>
  );

  // ---- Workspace mode: acting AS this company (left rail = company tools) ----
  if (actingAsThis && viewer) {
    return (
      <main className="flex-1">
        <WorkspaceShell user={viewer} active={tab}>
          {tab === "overview" && (
            <div className="space-y-6">
              <section className="rounded-xl border border-slate-200 bg-white p-6">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Company profile
                  </span>
                  <Link
                    href={`/company/${company.slug}?tab=storefront`}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Storefront
                  </Link>
                </div>
                {aboutBlock}
              </section>

              <div className="grid grid-cols-3 gap-3">
                <Stat label="Listings" value={listings.length} href={`/company/${company.slug}?tab=storefront`} />
                <Stat label="Team" value={company.memberships.length} href={`/company/${company.slug}?tab=team`} />
                <Stat label="Reviews" value={rating.count} href={`/company/${company.slug}?tab=reviews`} />
              </div>

              {isOwner && (
                <VerificationRequestCard
                  verified={company.verified}
                  request={verifReq}
                  subjectLabel={company.name}
                />
              )}

              <section>{storefrontBlock}</section>
            </div>
          )}
          {tab === "storefront" && <section>{storefrontBlock}</section>}
          {tab === "team" && <section>{teamBlock}</section>}
          {tab === "reviews" && <section>{reviewsBlock}</section>}
        </WorkspaceShell>
      </main>
    );
  }

  // ---- Public mode: visitors and controllers not currently acting-as ---------
  return (
    <main className="flex-1">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          {aboutBlock}
          <div className="mt-5 flex flex-wrap gap-2">
            {isOwner ? (
              <span className="rounded-md bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-800">
                You own this page. Switch your identity to{" "}
                <span className="font-semibold">{company.name}</span> (top bar) to
                manage it.
              </span>
            ) : (
              <>
                {viewer && (
                  <FollowButton
                    targetType="company"
                    targetValue={company.id}
                    following={followingCompany}
                    path={`/company/${company.slug}`}
                  />
                )}
                {viewer ? (
                  <form action={messageCompanyAction}>
                    <input type="hidden" name="companyId" value={company.id} />
                    <button
                      type="submit"
                      className="rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
                    >
                      Contact
                    </button>
                  </form>
                ) : (
                  <Link
                    href={`/signin?next=/company/${company.slug}`}
                    className="rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
                  >
                    Sign in to contact
                  </Link>
                )}
              </>
            )}
          </div>
        </section>

        <section className="mt-8">{storefrontBlock}</section>
        <section className="mt-8">{teamBlock}</section>
        <section className="mt-8">{reviewsBlock}</section>
      </div>
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
