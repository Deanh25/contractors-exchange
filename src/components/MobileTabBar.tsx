"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { label: "Market", href: "/listings", match: "/listings" },
  { label: "Feed", href: "/feed", match: "/feed" },
  { label: "List", href: "/listings/new", center: true, match: "/listings/new" },
  { label: "Inbox", href: "/messages", match: "/messages" },
  { label: "Me", href: "/me", match: "/me" },
];

/** Fixed bottom navigation for phones (PRD §8 responsive). Hidden on >= sm. */
export function MobileTabBar({ unread = 0 }: { unread?: number }) {
  const pathname = usePathname() ?? "";

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur sm:hidden">
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {TABS.map((t) => {
          const active = pathname === t.match || pathname.startsWith(t.match + "/");
          if (t.center) {
            return (
              <Link
                key={t.href}
                href={t.href}
                className="flex flex-1 flex-col items-center justify-center py-1.5"
              >
                <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-500 text-lg font-bold text-white shadow">
                  +
                </span>
              </Link>
            );
          }
          const showDot = t.href === "/messages" && unread > 0;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium ${
                active ? "text-brand-700" : "text-slate-500"
              }`}
            >
              <span className="relative">
                {t.label}
                {showDot && (
                  <span className="absolute -right-2.5 -top-1 h-2 w-2 rounded-full bg-brand-500" />
                )}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
