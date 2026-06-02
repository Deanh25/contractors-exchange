import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getUnreadCount } from "@/lib/messaging";
import {
  getUnreadNotificationCount,
  getRecentNotifications,
} from "@/lib/notifications";
import { getActingCompanies, getActingContext } from "@/lib/identity";
import { timeAgo } from "@/lib/time";
import { AvatarMenu } from "@/components/AvatarMenu";
import { NotificationBell, type BellItem } from "@/components/NotificationBell";
import { ActingAsSwitcher } from "@/components/ActingAsSwitcher";

const ICONS: Record<string, string> = {
  saved:
    "M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z",
  bell:
    "M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0",
  messages:
    "M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z",
};

function IconLink({
  href,
  label,
  icon,
  badge = 0,
}: {
  href: string;
  label: string;
  icon: string;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      title={label}
      aria-label={badge > 0 ? `${label} (${badge} unread)` : label}
      className="relative rounded-md p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    >
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.7}
        stroke="currentColor"
        aria-hidden
      >
        <path strokeLinecap="round" strokeLinejoin="round" d={ICONS[icon]} />
      </svg>
      {badge > 0 && (
        <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-brand-500 px-1 text-[10px] font-bold leading-none text-white">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </Link>
  );
}

export async function SiteHeader() {
  const user = await getCurrentUser();
  const [unread, notifUnread, notifs, actingCompanies, actingCtx] = user
    ? await Promise.all([
        getUnreadCount(user.id),
        getUnreadNotificationCount(user.id),
        getRecentNotifications(user.id, 8),
        getActingCompanies(user.id),
        getActingContext(user.id),
      ])
    : [0, 0, [], [], { type: "user" as const }];

  const bellItems: BellItem[] = notifs.map((n) => ({
    id: n.id,
    title: n.title,
    body: n.body,
    href: n.href,
    read: n.readAt !== null,
    time: timeAgo(n.createdAt),
    actorName: n.actor?.name ?? null,
    actorAvatar: n.actor?.avatarUrl ?? null,
  }));

  // Acting-as switcher (only when the user can act for a company).
  const switcherOptions = user
    ? [
        {
          id: "self",
          name: user.name,
          avatarUrl: user.avatarUrl,
          kind: "user" as const,
        },
        ...actingCompanies.map((c) => ({
          id: c.id,
          name: c.name,
          avatarUrl: c.logoUrl,
          kind: "company" as const,
        })),
      ]
    : [];
  const switcherCurrent =
    actingCtx.type === "company"
      ? {
          id: actingCtx.company.id,
          name: actingCtx.company.name,
          avatarUrl: actingCtx.company.logoUrl,
          kind: "company" as const,
        }
      : user
        ? {
            id: "self",
            name: user.name,
            avatarUrl: user.avatarUrl,
            kind: "user" as const,
          }
        : null;

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-brand-500 font-black text-white">
            CX
          </span>
          <span className="hidden text-base font-bold tracking-tight sm:block">
            <span className="text-slate-900">Contractors </span>
            <span className="text-brand-500">Exchange</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1 text-sm font-medium">
          <Link
            href="/listings"
            className="rounded-md px-3 py-1.5 text-slate-700 hover:bg-slate-100 hover:text-slate-900"
          >
            Marketplace
          </Link>
          <Link
            href="/feed"
            className="rounded-md px-3 py-1.5 text-slate-700 hover:bg-slate-100 hover:text-slate-900"
          >
            Feed
          </Link>
        </nav>

        <div className="flex items-center gap-1">
          {user ? (
            <>
              <div className="hidden items-center sm:flex">
                <IconLink href="/saved" label="Saved" icon="saved" />
                <NotificationBell unread={notifUnread} items={bellItems} />
                <IconLink
                  href="/messages"
                  label="Messages"
                  icon="messages"
                  badge={unread}
                />
              </div>
              <Link
                href="/listings/new"
                className="ml-1 hidden rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:block"
              >
                + List
              </Link>
              {switcherCurrent && switcherOptions.length > 1 && (
                <div className="ml-1">
                  <ActingAsSwitcher
                    current={switcherCurrent}
                    options={switcherOptions}
                  />
                </div>
              )}
              <div className="ml-1">
                <AvatarMenu name={user.name} avatarUrl={user.avatarUrl} />
              </div>
            </>
          ) : (
            <Link
              href="/signin"
              className="rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
