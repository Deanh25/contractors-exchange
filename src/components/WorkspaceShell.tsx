import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Avatar } from "@/components/Avatar";
import type { User } from "@/generated/prisma/client";

/**
 * The logged-in "workspace" shell (Software + LinkedIn feel): a persistent left
 * sub-menu + content area, shared by Messages, Orders, Saved, Notifications, and
 * Profile. On desktop it's a left rail; on mobile it collapses to a horizontal
 * scroll-chip strip. Pages render <WorkspaceShell user={user} active="orders">.
 */

type ItemKey =
  | "messages"
  | "saved"
  | "orders"
  | "notifications"
  | "profile"
  | "settings";

const ITEMS: { key: ItemKey; label: string; href: string }[] = [
  { key: "messages", label: "Inbox", href: "/messages" },
  { key: "orders", label: "Orders", href: "/orders" },
  { key: "saved", label: "Saved", href: "/saved" },
  { key: "notifications", label: "Notifications", href: "/notifications" },
  { key: "profile", label: "Profile", href: "/me" },
  { key: "settings", label: "Settings", href: "/me/edit" },
];

export async function WorkspaceShell({
  user,
  active,
  children,
}: {
  user: User;
  active: ItemKey;
  children: React.ReactNode;
}) {
  const pendingOrders = await prisma.transaction.count({
    where: { sellerId: user.id, status: "pending" },
  });
  const counts: Partial<Record<ItemKey, number>> = { orders: pendingOrders };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <div className="grid gap-6 lg:grid-cols-[230px_1fr]">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          {/* Identity card (desktop) */}
          <Link
            href="/me"
            className="mb-3 hidden items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 hover:bg-slate-50 lg:flex"
          >
            <Avatar name={user.name} src={user.avatarUrl} size={40} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">
                {user.name}
              </p>
              <p className="truncate text-xs text-slate-500">
                {user.title ?? "View profile"}
              </p>
            </div>
          </Link>

          {/* Nav: vertical on desktop, horizontal scroll-chips on mobile */}
          <nav className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
            {ITEMS.map((item) => {
              const isActive = item.key === active;
              const count = counts[item.key] ?? 0;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`flex shrink-0 items-center justify-between gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${
                    isActive
                      ? "bg-brand-50 text-brand-800"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <span>{item.label}</span>
                  {count > 0 && (
                    <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand-500 px-1 text-xs font-semibold text-white">
                      {count}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
