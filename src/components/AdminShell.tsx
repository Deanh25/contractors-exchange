"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Admin backend shell (PRD §7C): a dark left rail + content area, separate in
 * feel from the public app. Nav items are computed server-side per the admin's
 * role (see src/app/admin/layout.tsx) and passed in already filtered, so this
 * client component only handles layout + active-state highlighting. It never
 * decides permissions itself.
 */

export type AdminNavItem = { key: string; label: string; href: string };

export function AdminShell({
  name,
  roleLabel,
  items,
  children,
}: {
  name: string;
  roleLabel: string;
  items: AdminNavItem[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/admin"
      ? pathname === "/admin"
      : pathname === href || pathname.startsWith(href + "/");

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-slate-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-0 lg:flex-row">
        {/* Left rail */}
        <aside className="shrink-0 bg-[#1f2a37] text-slate-200 lg:min-h-[calc(100vh-3.5rem)] lg:w-60">
          <div className="px-4 py-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold uppercase tracking-wide text-white">
                CX Admin
              </span>
            </div>
            <div className="mt-2 rounded-lg bg-white/5 px-3 py-2">
              <p className="truncate text-sm font-medium text-white">{name}</p>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-300">
                {roleLabel}
              </p>
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-2 pb-3 lg:flex-col lg:overflow-visible">
            {items.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${
                    active
                      ? "bg-brand-500 text-white"
                      : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="hidden px-4 py-3 lg:block">
            <Link
              href="/"
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              ← Back to site
            </Link>
          </div>
        </aside>

        {/* Content */}
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
