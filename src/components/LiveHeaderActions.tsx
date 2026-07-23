"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Tooltip } from "@/components/Tooltip";
import { NotificationBell, type BellItem } from "@/components/NotificationBell";
import {
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from "@/app/actions/notification";

/**
 * The live half of the top bar (punch-list item 1): the notifications bell and
 * the messages icon, whose unread badges refresh on their own - no full page
 * reload that would interrupt what the user is doing.
 *
 * Seeded from the server render, then kept current by polling /api/badges every
 * 20s while the tab is visible, immediately on refocus, and once on every route
 * change (so, e.g., opening /messages drops the badge without waiting a cycle).
 * One request feeds both badges and the bell dropdown.
 */

const MESSAGES_PATH =
  "M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z";

const POLL_MS = 20000;

export function LiveHeaderActions({
  initialMessages,
  initialNotifications,
  initialItems,
}: {
  initialMessages: number;
  initialNotifications: number;
  initialItems: BellItem[];
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [items, setItems] = useState<BellItem[]>(initialItems);
  const pathname = usePathname();

  const poll = useCallback(async () => {
    try {
      const res = await fetch("/api/badges", { cache: "no-store" });
      if (!res.ok) return;
      const data: {
        messages: number;
        notifications: number;
        items: BellItem[];
      } = await res.json();
      setMessages(data.messages);
      setNotifications(data.notifications);
      setItems(data.items);
    } catch {
      // A dropped poll is harmless; the next one recovers.
    }
  }, []);

  // Interval + refocus. Kept in one effect so there's a single timer.
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    const start = () => {
      timer = setInterval(() => {
        if (!document.hidden) poll();
      }, POLL_MS);
    };
    const onVisible = () => {
      if (!document.hidden) poll();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    start();
    return () => {
      if (timer) clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [poll]);

  // Route change: refresh once, so navigating INTO a page that clears unread
  // (messages, notifications) updates the badge right away. poll() is async and
  // only setStates after its fetch resolves, so this is a genuine external-system
  // sync, not the synchronous cascade the lint rule guards against.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    poll();
  }, [pathname, poll]);

  const onItemRead = useCallback((id: string) => {
    // Optimistic: drop the badge and grey the row now; the server catches up.
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    setNotifications((n) => Math.max(0, n - 1));
    markNotificationReadAction(id).catch(() => {});
  }, []);

  const onAllRead = useCallback(() => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setNotifications(0);
    markAllNotificationsReadAction().catch(() => {});
  }, []);

  return (
    <>
      <NotificationBell
        unread={notifications}
        items={items}
        onItemRead={onItemRead}
        onAllRead={onAllRead}
      />
      <Tooltip label="Messages">
        <Link
          href="/messages"
          aria-label={
            messages > 0 ? `Messages (${messages} unread)` : "Messages"
          }
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
            <path strokeLinecap="round" strokeLinejoin="round" d={MESSAGES_PATH} />
          </svg>
          {messages > 0 && (
            <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-brand-500 px-1 text-[10px] font-bold leading-none text-white">
              {messages > 9 ? "9+" : messages}
            </span>
          )}
        </Link>
      </Tooltip>
    </>
  );
}
