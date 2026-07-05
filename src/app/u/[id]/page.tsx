import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { ProfileHeader } from "@/components/ProfileHeader";
import { Avatar } from "@/components/Avatar";
import { FollowButton } from "@/components/FollowButton";
import { StarRating } from "@/components/StarRating";
import { ReviewList } from "@/components/ReviewList";
import { messageUserAction } from "@/app/actions/message";
import { isFollowing, getFollowCounts } from "@/lib/follows";
import { getActingContext } from "@/lib/identity";
import type { Party } from "@/lib/messaging";
import { getUserRating, getUserReviews } from "@/lib/reviews";
import { tradesFromJson } from "@/lib/trades";
import { getCategoryLabelMap } from "@/lib/categories";

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [user, viewer] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
      include: {
        memberships: { include: { company: true }, orderBy: { createdAt: "asc" } },
      },
    }),
    getCurrentUser(),
  ]);

  if (!user) notFound();
  const isOwn = viewer?.id === user.id;

  let viewerParty: Party | null = null;
  if (viewer) {
    const ctx = await getActingContext(viewer.id);
    viewerParty =
      ctx.type === "company"
        ? { type: "company", id: ctx.company.id }
        : { type: "user", id: viewer.id };
  }
  const target: Party = { type: "user", id: user.id };

  const [followingUser, counts, rating, reviews] = await Promise.all([
    viewerParty && !isOwn
      ? isFollowing(viewerParty, target)
      : Promise.resolve(false),
    getFollowCounts(target),
    getUserRating(user.id),
    getUserReviews(user.id),
  ]);

  const trades = tradesFromJson(user.trades);
  const catLabels = await getCategoryLabelMap();

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          {user.bannerUrl && (
            <div className="-mx-6 -mt-6 mb-6 h-32 overflow-hidden rounded-t-xl bg-slate-100 sm:h-40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={user.bannerUrl} alt="" className="h-full w-full object-cover" />
            </div>
          )}
          <ProfileHeader profile={user} compact />
          {user.headline && (
            <p className="mt-2 text-sm font-medium text-slate-600">{user.headline}</p>
          )}

          <div className="mt-3">
            <StarRating rating={rating.avg} count={rating.count} />
          </div>

          <div className="mt-3 flex gap-4 text-sm text-slate-600">
            <Link
              href={`/network?party=user:${user.id}&tab=followers`}
              className="hover:underline"
            >
              <span className="font-semibold text-slate-900">
                {counts.followers}
              </span>{" "}
              followers
            </Link>
            <Link
              href={`/network?party=user:${user.id}&tab=following`}
              className="hover:underline"
            >
              <span className="font-semibold text-slate-900">
                {counts.following}
              </span>{" "}
              following
            </Link>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {isOwn ? (
              <Link
                href="/me/edit"
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Edit profile
              </Link>
            ) : (
              <>
                {viewer && (
                  <FollowButton
                    targetType="user"
                    targetValue={user.id}
                    following={followingUser}
                    path={`/u/${user.id}`}
                  />
                )}
                {viewer ? (
                  <form action={messageUserAction}>
                    <input type="hidden" name="userId" value={user.id} />
                    <button
                      type="submit"
                      className="rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
                    >
                      Contact
                    </button>
                  </form>
                ) : (
                  <Link
                    href={`/signin?next=/u/${user.id}`}
                    className="rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
                  >
                    Sign in to contact
                  </Link>
                )}
              </>
            )}
          </div>

          {user.bio && (
            <div className="mt-6 border-t border-slate-100 pt-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                About
              </h3>
              <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{user.bio}</p>
            </div>
          )}

          {trades.length > 0 && (
            <div className="mt-5">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Trades
              </h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {trades.map((t) => (
                  <span
                    key={t}
                    className="rounded-full border border-slate-300 bg-white px-2.5 py-0.5 text-xs font-medium text-slate-700"
                  >
                    {catLabels[t] ?? t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {user.credentials && (
            <div className="mt-5 border-t border-slate-100 pt-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Licenses &amp; certifications
              </h3>
              <p className="mt-1 whitespace-pre-line text-sm text-slate-700">
                {user.credentials}
              </p>
            </div>
          )}
        </section>

        {user.memberships.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Companies
            </h2>
            <ul className="space-y-2">
              {user.memberships.map((m) => (
                <li key={m.id}>
                  <Link
                    href={`/company/${m.company.slug}`}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 hover:bg-slate-50"
                  >
                    <Avatar name={m.company.name} src={m.company.logoUrl} size={40} rounded="md" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-900">{m.company.name}</p>
                      <p className="text-xs text-slate-500">
                        {m.role === "owner" ? "Owner" : "Member"}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Reviews
          </h2>
          <ReviewList reviews={reviews} />
        </section>
      </div>
    </main>
  );
}
