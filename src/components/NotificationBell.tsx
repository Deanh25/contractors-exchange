"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { markAllNotificationsReadAction } from "@/app/actions/notification";

export type BellItem = {
  id: string;
  title: string;
  body: string | null;
  href: string;
  read: boolean;
  time: string;
  actorName: string | null;
  actorAvatar: string | null;
  actorIsCompany?: boolean;
  /** Set when this alert is addressed to a company (labels it in the bell). */
  forCompany?: string | null;
};

const BELL =
  "M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0";

/** Top-bar notifications bell with an unread badge and a recent-activity
 * dropdown. Opening it does not auto-clear; "Mark all read" or visiting the
 * page does. */
export function NotificationBell({
  unread,
  items,
}: {
  unread: number;
  items: BellItem[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Notifications"
        aria-label={unread > 0 ? `Notifications (${unread} unread)` : "Notifications"}
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
          <path strokeLinecap="round" strokeLinejoin="round" d={BELL} />
        </svg>
        {unread > 0 && (
          <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-brand-500 px-1 text-[10px] font-bold leading-none text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
            <span className="text-sm font-semibold text-slate-900">
              Notifications
            </span>
            {unread > 0 && (
              <form action={markAllNotificationsReadAction}>
                <button
                  type="submit"
                  className="text-xs font-medium text-brand-600 hover:text-brand-700"
                >
                  Mark all read
                </button>
              </form>
            )}
          </div>

          {items.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-slate-400">
              You are all caught up.
            </p>
          ) : (
            <ul className="max-h-96 overflow-y-auto">
              {items.map((n) => (
                <li key={n.id}>
                  <Link
                    href={n.href}
                    onClick={() => setOpen(false)}
                    className={`flex gap-3 px-3 py-2.5 hover:bg-slate-50 ${
                      n.read ? "" : "bg-brand-50/50"
                    }`}
                  >
                    <div className="relative shrink-0">
                      <Avatar
                        name={n.actorName ?? "CX"}
                        src={n.actorAvatar}
                        size={36}
                        rounded={n.actorIsCompany ? "md" : "full"}
                      />
                      {!n.read && (
                        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-brand-500" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      {n.forCompany && (
                        <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-brand-600">
                          {n.forCompany}
                        </p>
                      )}
                      <p
                        className={`truncate text-sm ${
                          n.read
                            ? "text-slate-700"
                            : "font-semibold text-slate-900"
                        }`}
                      >
                        {n.title}
                      </p>
                      {n.body && (
                        <p className="truncate text-xs text-slate-500">
                          {n.body}
                        </p>
                      )}
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        {n.time}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="block border-t border-slate-100 px-3 py-2 text-center text-sm font-medium text-brand-600 hover:bg-slate-50"
          >
            See all notifications
          </Link>
        </div>
      )}
    </div>
  );
}
