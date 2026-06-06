import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getActingContext } from "@/lib/identity";
import { partiesEqual, type Party } from "@/lib/messaging";
import { Avatar } from "@/components/Avatar";
import { FollowButton } from "@/components/FollowButton";
import {
  getFollowCounts,
  listFollowers,
  listFollowing,
  resolvePartyDisplay,
  type FollowEntry,
} from "@/lib/follows";

type Tab = "following" | "followers";

/** Parse a "user:<id>" / "company:<id>" param into a party. */
function parseParty(value: string | undefined): Party | null {
  if (!value) return null;
  const [type, id] = value.split(":");
  if ((type === "user" || type === "company") && id) return { type, id };
  return null;
}

/** The Following / Followers network view (PRD §4). Defaults to the viewer's own
 * network; `?party=user:<id>` (or company) shows anyone's, with follow-back. */
export default async function NetworkPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; party?: string }>;
}) {
  const sp = await searchParams;
  const tab: Tab = sp.tab === "followers" ? "followers" : "following";

  const viewer = await getCurrentUser();
  let viewerParty: Party | null = null;
  if (viewer) {
    const ctx = await getActingContext(viewer.id);
    viewerParty =
      ctx.type === "company"
        ? { type: "company", id: ctx.company.id }
        : { type: "user", id: viewer.id };
  }

  // Subject = the explicit party, else the viewer's own network.
  const subject = parseParty(sp.party) ?? viewerParty;
  if (!subject) redirect("/signin?next=/network");

  const [display, counts, entries] = await Promise.all([
    resolvePartyDisplay(subject),
    getFollowCounts(subject),
    tab === "followers"
      ? listFollowers(subject, viewerParty)
      : listFollowing(subject, viewerParty),
  ]);

  const isOwn = viewerParty && partiesEqual(viewerParty, subject);
  const title = isOwn ? "Your network" : `${display?.name ?? "Network"}`;
  const partyParam = `${subject.type}:${subject.id}`;
  const basePath = (t: Tab) =>
    isOwn ? `/network?tab=${t}` : `/network?party=${partyParam}&tab=${t}`;
  const currentPath = basePath(tab);

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {title}
        </h1>
        {!isOwn && display && (
          <Link
            href={display.href}
            className="mt-1 inline-block text-sm text-brand-700 hover:underline"
          >
            View profile
          </Link>
        )}

        <div className="mt-5 flex gap-5 border-b border-slate-200">
          <TabLink
            href={basePath("following")}
            label="Following"
            count={counts.following}
            active={tab === "following"}
          />
          <TabLink
            href={basePath("followers")}
            label="Followers"
            count={counts.followers}
            active={tab === "followers"}
          />
        </div>

        {entries.length === 0 ? (
          <p className="mt-8 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-500">
            {tab === "following"
              ? isOwn
                ? "You are not following anyone yet. Follow people and companies to build your network."
                : "Not following anyone yet."
              : isOwn
                ? "No followers yet. Post and engage so others discover you."
                : "No followers yet."}
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {entries.map((e) => (
              <NetworkRow
                key={`${e.type}:${e.id}`}
                entry={e}
                viewerParty={viewerParty}
                path={currentPath}
              />
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

function TabLink({
  href,
  label,
  count,
  active,
}: {
  href: string;
  label: string;
  count: number;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-1.5 border-b-2 px-1 pb-2 text-sm font-medium transition ${
        active
          ? "border-brand-500 text-slate-900"
          : "border-transparent text-slate-500 hover:text-slate-800"
      }`}
    >
      {label}
      <span className="rounded-full bg-slate-100 px-1.5 text-xs font-semibold text-slate-500">
        {count}
      </span>
    </Link>
  );
}

function NetworkRow({
  entry,
  viewerParty,
  path,
}: {
  entry: FollowEntry;
  viewerParty: Party | null;
  path: string;
}) {
  const isSelf =
    viewerParty && partiesEqual(viewerParty, { type: entry.type, id: entry.id });
  return (
    <li className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
      <Link href={entry.href} className="shrink-0">
        <Avatar
          name={entry.name}
          src={entry.avatar}
          size={48}
          rounded={entry.type === "company" ? "md" : "full"}
        />
      </Link>
      <div className="min-w-0 flex-1">
        <Link
          href={entry.href}
          className="block truncate font-semibold text-slate-900 hover:underline"
        >
          {entry.name}
        </Link>
        {entry.headline && (
          <p className="truncate text-sm text-slate-500">{entry.headline}</p>
        )}
      </div>
      {viewerParty && !isSelf && (
        <FollowButton
          targetType={entry.type}
          targetValue={entry.id}
          following={entry.isViewerFollowing}
          path={path}
        />
      )}
    </li>
  );
}
