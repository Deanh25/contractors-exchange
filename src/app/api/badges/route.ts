import { getCurrentUser } from "@/lib/auth";
import { getUnreadCount } from "@/lib/messaging";
import {
  getUnreadNotificationCount,
  getRecentNotifications,
} from "@/lib/notifications";
import { getActingContext } from "@/lib/identity";
import { timeAgo } from "@/lib/time";
import type { BellItem } from "@/components/NotificationBell";

/**
 * Top-bar live badges (punch-list item 1). GET /api/badges returns the current
 * message + notification unread counts and the recent bell items for the acting
 * identity, so the header can keep them current WITHOUT a full page reload.
 *
 * Counts respect acting-as: a company message/notification only lights up the
 * badge while the user is acting as that company, exactly like the server render
 * in SiteHeader. Read-only, so it stays a route handler, not a service call.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json(
      { messages: 0, notifications: 0, items: [] },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const actingCtx = await getActingContext(user.id);
  const party =
    actingCtx.type === "company"
      ? { type: "company" as const, id: actingCtx.company.id }
      : { type: "user" as const, id: user.id };

  const [messages, notifications, notifs] = await Promise.all([
    getUnreadCount(party),
    getUnreadNotificationCount(user.id),
    getRecentNotifications(user.id, 8),
  ]);

  const items: BellItem[] = notifs.map((n) => ({
    id: n.id,
    title: n.title,
    body: n.body,
    href: n.href,
    read: n.readAt !== null,
    time: timeAgo(n.createdAt),
    actorName: n.actorCompany?.name ?? n.actorUser?.name ?? null,
    actorAvatar: n.actorCompany?.logoUrl ?? n.actorUser?.avatarUrl ?? null,
    actorIsCompany: !!n.actorCompany,
    forCompany: n.recipientCompany?.name ?? null,
  }));

  return Response.json(
    { messages, notifications, items },
    { headers: { "Cache-Control": "no-store" } },
  );
}
