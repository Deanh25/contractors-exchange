import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Avatar } from "@/components/Avatar";
import { getUnreadCount } from "@/lib/messaging";
import { getUnreadNotificationCount } from "@/lib/notifications";
import { getActingContext } from "@/lib/identity";
import type { User } from "@/generated/prisma/client";

/**
 * The logged-in "workspace" shell (Software + LinkedIn feel): a persistent left
 * sub-menu + content area. It is identity-aware: acting as yourself shows your
 * personal hub; acting as a company swaps the rail to that company's tools
 * (Overview/Storefront/Inbox/Orders/Team/Reviews). Personal-only pages pass
 * scope="personal" to keep the personal rail regardless of context.
 */

type ItemKey =
  | "messages"
  | "orders"
  | "insights"
  | "saved"
  | "notifications"
  | "profile"
  | "settings"
  | "overview"
  | "storefront"
  | "team"
  | "reviews";

type NavItem = { key: ItemKey; label: string; href: string };

const PERSONAL_ITEMS: NavItem[] = [
  { key: "messages", label: "Inbox", href: "/messages" },
  { key: "orders", label: "Orders", href: "/orders" },
  { key: "insights", label: "Insights", href: "/insights" },
  { key: "saved", label: "Saved", href: "/saved" },
  { key: "notifications", label: "Notifications", href: "/notifications" },
  { key: "profile", label: "Profile", href: "/me" },
  { key: "settings", label: "Settings", href: "/me/edit" },
];

export async function WorkspaceShell({
  user,
  active,
  scope = "auto",
  children,
}: {
  user: User;
  active: ItemKey;
  /** "personal" forces the personal rail; "auto" follows the acting identity. */
  scope?: "auto" | "personal";
  children: React.ReactNode;
}) {
  const ctx = await getActingContext(user.id);
  const company = scope === "personal" || ctx.type !== "company" ? null : ctx.company;

  let items: NavItem[];
  let counts: Partial<Record<ItemKey, number>> = {};
  let identity: { name: string; subtitle: string; avatarUrl: string | null; href: string; rounded: "md" | "full" };

  if (company) {
    const [pendingOrders, unreadMessages] = await Promise.all([
      prisma.transaction.count({
        where: { status: "pending", sellerCompanyId: company.id },
      }),
      getUnreadCount({ type: "company", id: company.id }),
    ]);
    items = [
      { key: "overview", label: "Overview", href: `/company/${company.slug}` },
      { key: "storefront", label: "Storefront", href: `/company/${company.slug}?tab=storefront` },
      { key: "messages", label: "Inbox", href: "/messages" },
      { key: "orders", label: "Orders", href: "/orders" },
      { key: "insights", label: "Insights", href: "/insights" },
      { key: "team", label: "Team", href: `/company/${company.slug}?tab=team` },
      { key: "reviews", label: "Reviews", href: `/company/${company.slug}?tab=reviews` },
    ];
    counts = { orders: pendingOrders, messages: unreadMessages };
    identity = {
      name: company.name,
      subtitle: "Acting as company",
      avatarUrl: company.logoUrl,
      href: `/company/${company.slug}`,
      rounded: "md",
    };
  } else {
    const [pendingOrders, unreadMessages, unreadNotifs] = await Promise.all([
      prisma.transaction.count({
        where: { sellerUserId: user.id, status: "pending" },
      }),
      getUnreadCount({ type: "user", id: user.id }),
      getUnreadNotificationCount(user.id),
    ]);
    items = PERSONAL_ITEMS;
    counts = {
      orders: pendingOrders,
      messages: unreadMessages,
      notifications: unreadNotifs,
    };
    identity = {
      name: user.name,
      subtitle: user.title ?? "View profile",
      avatarUrl: user.avatarUrl,
      href: "/me",
      rounded: "full",
    };
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <div className="grid gap-6 lg:grid-cols-[230px_1fr]">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          {/* Identity card (desktop) */}
          <Link
            href={identity.href}
            className="mb-3 hidden items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 hover:bg-slate-50 lg:flex"
          >
            <Avatar
              name={identity.name}
              src={identity.avatarUrl}
              size={40}
              rounded={identity.rounded}
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">
                {identity.name}
              </p>
              <p className="truncate text-xs text-slate-500">
                {identity.subtitle}
              </p>
            </div>
          </Link>

          {/* Nav: vertical on desktop, horizontal scroll-chips on mobile */}
          <nav className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
            {items.map((item) => {
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
