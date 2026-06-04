import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { Avatar } from "@/components/Avatar";
import { WorkspaceShell } from "@/components/WorkspaceShell";
import { MarkNotificationsRead } from "@/components/MarkNotificationsRead";
import { getRecentNotifications } from "@/lib/notifications";
import { timeAgo } from "@/lib/time";
import type { NotificationType } from "@/generated/prisma/client";

// Small color-coded label per type (gives the list scannable structure).
const TYPE_LABEL: Record<NotificationType, { label: string; cls: string }> = {
  message: { label: "Message", cls: "bg-sky-100 text-sky-700" },
  order_new: { label: "New deal", cls: "bg-emerald-100 text-emerald-700" },
  order_update: { label: "Deal update", cls: "bg-amber-100 text-amber-700" },
  review_new: { label: "Review", cls: "bg-violet-100 text-violet-700" },
  follow_new: { label: "Follow", cls: "bg-slate-100 text-slate-600" },
  post_mention: { label: "Mention", cls: "bg-rose-100 text-rose-700" },
  offer_new: { label: "Offer", cls: "bg-amber-100 text-amber-700" },
  offer_update: { label: "Offer", cls: "bg-amber-100 text-amber-700" },
  verification_update: { label: "Verification", cls: "bg-sky-100 text-sky-700" },
};

function FilterTab({
  filter,
  label,
  count,
  active,
}: {
  filter: "all" | "unread";
  label: string;
  count: number;
  active: boolean;
}) {
  const href = filter === "all" ? "/notifications" : "/notifications?filter=unread";
  return (
    <Link
      href={href}
      className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
        active
          ? "bg-brand-500 text-white"
          : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
      }`}
    >
      {label}
      {count > 0 && (
        <span
          className={`rounded-full px-1.5 text-xs font-semibold ${
            active ? "bg-white/25 text-white" : "bg-slate-100 text-slate-500"
          }`}
        >
          {count}
        </span>
      )}
    </Link>
  );
}

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const user = await requireUser("/notifications");
  const sp = await searchParams;
  const filter: "all" | "unread" = sp.filter === "unread" ? "unread" : "all";

  const notifs = await getRecentNotifications(user.id, 60);

  const unreadCount = notifs.filter((n) => n.readAt === null).length;
  const visible =
    filter === "unread" ? notifs.filter((n) => n.readAt === null) : notifs;

  return (
    <main className="flex-1">
      {/* Viewing the page clears the unread badge. */}
      <MarkNotificationsRead hasUnread={unreadCount > 0} />
      <WorkspaceShell user={user} active="notifications">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Notifications
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Deal requests, messages, reviews, and follows, all in one place.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <FilterTab
            filter="all"
            label="All"
            count={notifs.length}
            active={filter === "all"}
          />
          <FilterTab
            filter="unread"
            label="Unread"
            count={unreadCount}
            active={filter === "unread"}
          />
        </div>

        {visible.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-500">
            {filter === "unread"
              ? "No unread notifications."
              : "No notifications yet. Activity on your deals, messages, reviews, and follows will show up here."}
          </div>
        ) : (
          <ul className="mt-4 space-y-2">
            {visible.map((n) => {
              const unread = n.readAt === null;
              const meta = TYPE_LABEL[n.type];
              return (
                <li key={n.id}>
                  <Link
                    href={n.href}
                    className={`flex gap-3 rounded-xl border p-3 transition hover:bg-slate-50 ${
                      unread
                        ? "border-brand-200 bg-brand-50/40"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="relative shrink-0">
                      <Avatar
                        name={n.actorCompany?.name ?? n.actorUser?.name ?? "CX"}
                        src={n.actorCompany?.logoUrl ?? n.actorUser?.avatarUrl}
                        size={42}
                        rounded={n.actorCompany ? "md" : "full"}
                      />
                      {unread && (
                        <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-brand-500" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${meta.cls}`}
                        >
                          {meta.label}
                        </span>
                        {n.recipientCompany && (
                          <span className="rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-700">
                            {n.recipientCompany.name}
                          </span>
                        )}
                        <span className="text-xs text-slate-400">
                          {timeAgo(n.createdAt)}
                        </span>
                      </div>
                      <p
                        className={`mt-1 truncate ${
                          unread
                            ? "font-semibold text-slate-900"
                            : "font-medium text-slate-800"
                        }`}
                      >
                        {n.title}
                      </p>
                      {n.body && (
                        <p className="truncate text-sm text-slate-500">
                          {n.body}
                        </p>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </WorkspaceShell>
    </main>
  );
}
