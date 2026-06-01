import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { Avatar } from "@/components/Avatar";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { tradeLabel, tradesFromJson } from "@/lib/trades";
import { metroLabel } from "@/lib/locations";
import { ListingCard } from "@/components/ListingCard";
import { ownerInclude } from "@/lib/listings";
import { FollowButton } from "@/components/FollowButton";
import { messageCompanyAction } from "@/app/actions/message";
import { isFollowing } from "@/lib/follows";

export default async function CompanyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
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

  const listings = await prisma.listing.findMany({
    where: { ownerCompanyId: company.id, status: "active" },
    include: ownerInclude,
    orderBy: { createdAt: "desc" },
  });

  const trades = tradesFromJson(company.trades);
  const location = metroLabel(company.city, company.state);
  const isOwner = company.memberships.some(
    (m) => m.userId === viewer?.id && m.role === "owner",
  );
  const followingCompany =
    viewer && !isOwner
      ? await isFollowing(viewer.id, "company", company.id)
      : false;

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        {/* Company header */}
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <Avatar name={company.name} src={company.logoUrl} size={72} rounded="md" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  {company.name}
                </h1>
                {company.verified && <VerifiedBadge />}
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
                      {tradeLabel(t)}
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

          <div className="mt-5 flex flex-wrap gap-2">
            {isOwner ? (
              <span className="rounded-md bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-800">
                You own this page
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

        {/* Storefront */}
        <section className="mt-8">
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
        </section>

        {/* Team */}
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Team
          </h2>
          <ul className="space-y-2">
            {company.memberships.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/u/${m.user.id}`}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 hover:bg-slate-50"
                >
                  <Avatar name={m.user.name} src={m.user.avatarUrl} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-900">{m.user.name}</p>
                    <p className="text-xs text-slate-500">
                      {m.role === "owner" ? "Owner" : "Member"}
                      {m.user.title ? ` · ${m.user.title}` : ""}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
