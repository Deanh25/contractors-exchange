import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { Avatar } from "@/components/Avatar";
import { FollowButton } from "@/components/FollowButton";
import { StarRating } from "@/components/StarRating";
import { ReviewList } from "@/components/ReviewList";
import { ListingCard } from "@/components/ListingCard";
import { ProfileCover } from "@/components/ProfileCover";
import { ProfileTabs, parseProfileTab } from "@/components/ProfileTabs";
import { ProfilePhotos } from "@/components/ProfilePhotos";
import { ProfilePosts } from "@/components/ProfilePosts";
import { messageUserAction } from "@/app/actions/message";
import { isFollowing, getFollowCounts } from "@/lib/follows";
import { getActingContext } from "@/lib/identity";
import type { Party } from "@/lib/messaging";
import { getUserRating, getUserReviews } from "@/lib/reviews";
import { tradesFromJson } from "@/lib/trades";
import { getCategoryLabelMap } from "@/lib/categories";
import { metroLabel } from "@/lib/locations";
import { ownerInclude } from "@/lib/listings";

export default async function PublicProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const tab = parseProfileTab((await searchParams).tab);

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

  const [followingUser, counts, rating, reviews, listings] = await Promise.all([
    viewerParty && !isOwn ? isFollowing(viewerParty, target) : Promise.resolve(false),
    getFollowCounts(target),
    getUserRating(user.id),
    getUserReviews(user.id),
    prisma.listing.findMany({
      where: { ownerUserId: user.id, status: "active" },
      include: ownerInclude,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const photos = await prisma.profilePhoto.findMany({
    where: { ownerUserId: user.id },
    orderBy: { sortOrder: "asc" },
    select: { id: true, url: true },
  });

  const trades = tradesFromJson(user.trades);
  const catLabels = await getCategoryLabelMap();
  const location = metroLabel(user.city, user.state);
  const base = `/u/${user.id}`;

  const actions = isOwn ? (
    <Link
      href="/me/edit"
      className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
    >
      Edit profile
    </Link>
  ) : viewer ? (
    <>
      <FollowButton targetType="user" targetValue={user.id} following={followingUser} path={base} />
      <form action={messageUserAction}>
        <input type="hidden" name="userId" value={user.id} />
        <button
          type="submit"
          className="rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
        >
          Contact
        </button>
      </form>
    </>
  ) : (
    <Link
      href={`/signin?next=${base}`}
      className="rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
    >
      Sign in to contact
    </Link>
  );

  const aboutSection = (
    <div className="space-y-5">
      {user.bio && (
        <Section label="About">
          <p className="whitespace-pre-line text-sm text-slate-700">{user.bio}</p>
        </Section>
      )}
      {trades.length > 0 && (
        <Section label="Trades">
          <div className="flex flex-wrap gap-2">
            {trades.map((t) => (
              <span
                key={t}
                className="rounded-full border border-slate-300 bg-white px-2.5 py-0.5 text-xs font-medium text-slate-700"
              >
                {catLabels[t] ?? t}
              </span>
            ))}
          </div>
        </Section>
      )}
      {user.credentials && (
        <Section label="Licenses & certifications">
          <p className="whitespace-pre-line text-sm text-slate-700">{user.credentials}</p>
        </Section>
      )}
      {!user.bio && trades.length === 0 && !user.credentials && (
        <p className="text-sm text-slate-400">Nothing here yet.</p>
      )}
    </div>
  );

  const companiesSection = user.memberships.length > 0 && (
    <Section label="Companies">
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
    </Section>
  );

  const listingsSection = (
    <Section label="Listings">
      {listings.length === 0 ? (
        <p className="text-sm text-slate-400">No active listings.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {listings.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      )}
    </Section>
  );

  const reviewsSection = (
    <Section label="Reviews">
      <ReviewList reviews={reviews} />
    </Section>
  );

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        {isOwn && (
          <div className="mb-4 flex items-center justify-between rounded-lg bg-slate-900 px-4 py-2 text-sm text-white">
            <span>Previewing your public profile</span>
            <Link
              href="/me"
              className="rounded bg-white/15 px-3 py-1 font-medium hover:bg-white/25"
            >
              Back to workspace
            </Link>
          </div>
        )}
        <ProfileCover
          name={user.name}
          avatarUrl={user.avatarUrl}
          bannerUrl={user.bannerUrl}
          verified={user.verified}
          shape="circle"
          subtitle={user.headline}
          meta={
            <>
              {user.title && <span>{user.title}</span>}
              {user.title && location ? " · " : ""}
              {location && <span>📍 {location}</span>}
              <span className="ml-1">
                <StarRating rating={rating.avg} count={rating.count} />
              </span>
            </>
          }
          followers={counts.followers}
          following={counts.following}
          followersHref={`/network?party=user:${user.id}&tab=followers`}
          followingHref={`/network?party=user:${user.id}&tab=following`}
          actions={actions}
        />

        <ProfileTabs basePath={base} active={tab} />

        <div className="mt-6">
          {tab === "home" && (
            <div className="space-y-6">
              {companiesSection}
              {aboutSection}
              {listingsSection}
              {reviewsSection}
            </div>
          )}
          {tab === "about" && aboutSection}
          {tab === "listings" && listingsSection}
          {tab === "reviews" && reviewsSection}
          {tab === "posts" && (
            <ProfilePosts
              author={{ userId: user.id }}
              viewerParty={viewerParty}
              canReact={!!viewer}
              canComment={!!viewer}
            />
          )}
          {tab === "photos" && (
            // Public profile is read-only; photo management lives in the /me
            // workspace Photos tab.
            <ProfilePhotos photos={photos} canManage={false} />
          )}
        </div>
      </div>
    </main>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </h3>
      {children}
    </section>
  );
}
