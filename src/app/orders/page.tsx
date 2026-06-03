import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Avatar } from "@/components/Avatar";
import { WorkspaceShell } from "@/components/WorkspaceShell";
import { TX_STATUS, TX_TYPE_LABEL } from "@/lib/transactions";
import { formatMoney } from "@/lib/listings";
import { timeAgo } from "@/lib/time";
import { getActingContext } from "@/lib/identity";
import {
  txPartyInclude,
  orderPartyDisplay,
  buyerWhere,
  sellerWhere,
} from "@/lib/orders";
import type { Party } from "@/lib/messaging";
import type { Prisma, TransactionStatus } from "@/generated/prisma/client";

const STATUSES: TransactionStatus[] = [
  "pending",
  "accepted",
  "completed",
  "declined",
  "cancelled",
];

function buildQuery(params: Record<string, string>, omit: string[] = []): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v && !omit.includes(k)) usp.set(k, v);
  }
  return `/orders?${usp.toString()}`;
}

function TabLink({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold ${
        active
          ? "border-brand-500 text-slate-900"
          : "border-transparent text-slate-500 hover:text-slate-800"
      }`}
    >
      {label}
    </Link>
  );
}

const inputCls = "rounded-md border border-slate-300 px-3 py-2 text-sm";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; status?: string; q?: string }>;
}) {
  const user = await requireUser("/orders");
  const sp = await searchParams;
  const tab = sp.tab === "buying" ? "buying" : "selling";
  const status = (sp.status ?? "").trim();
  const q = (sp.q ?? "").trim();

  // The orders book is scoped to the current acting identity (you, or a company
  // you act for). Switch identity in the top bar to see a company's orders.
  const ctx = await getActingContext(user.id);
  const party: Party =
    ctx.type === "company"
      ? { type: "company", id: ctx.company.id }
      : { type: "user", id: user.id };
  const ledgerLabel = ctx.type === "company" ? ctx.company.name : "you";

  const roleWhere = tab === "selling" ? sellerWhere(party) : buyerWhere(party);
  const where: Prisma.TransactionWhereInput = {
    ...roleWhere,
    ...(STATUSES.includes(status as TransactionStatus)
      ? { status: status as TransactionStatus }
      : {}),
    ...(q ? { listing: { title: { contains: q } } } : {}),
  };

  const [rows, sellingCount, buyingCount] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: { listing: true, ...txPartyInclude },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.transaction.count({ where: sellerWhere(party) }),
    prisma.transaction.count({ where: buyerWhere(party) }),
  ]);

  const allParams: Record<string, string> = { tab, status, q };
  const chips: { label: string; href: string }[] = [];
  if (STATUSES.includes(status as TransactionStatus))
    chips.push({
      label: TX_STATUS[status as TransactionStatus].label,
      href: buildQuery(allParams, ["status"]),
    });
  if (q) chips.push({ label: `"${q}"`, href: buildQuery(allParams, ["q"]) });
  const hasFilters = chips.length > 0;

  return (
    <main className="flex-1">
      <WorkspaceShell user={user} active="orders">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Orders</h1>
        <p className="mt-1 text-sm text-slate-500">
          On-platform deals for{" "}
          <span className="font-medium text-slate-700">{ledgerLabel}</span>. Open
          one to review, respond, and complete it.
        </p>

        {/* Selling / Buying tabs */}
        <div className="mt-4 flex border-b border-slate-200">
          <TabLink
            href="/orders?tab=selling"
            active={tab === "selling"}
            label={`Selling (${sellingCount})`}
          />
          <TabLink
            href="/orders?tab=buying"
            active={tab === "buying"}
            label={`Buying (${buyingCount})`}
          />
        </div>

        {/* Search + status filter */}
        <form method="get" className="mt-4 flex flex-wrap items-center gap-2">
          <input type="hidden" name="tab" value={tab} />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search orders by listing…"
            className={`${inputCls} min-w-0 flex-1`}
          />
          <select name="status" defaultValue={status} className={inputCls}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {TX_STATUS[s].label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Apply
          </button>
        </form>

        {hasFilters && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {chips.map((c) => (
              <Link
                key={c.label}
                href={c.href}
                className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                {c.label}
                <span className="text-slate-400" aria-hidden>
                  ✕
                </span>
              </Link>
            ))}
            <Link
              href={`/orders?tab=${tab}`}
              className="text-xs font-medium text-slate-500 underline hover:text-slate-700"
            >
              Clear all
            </Link>
          </div>
        )}

        {/* Orders list */}
        {rows.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-500">
            {tab === "selling"
              ? "No incoming orders yet."
              : "You haven't placed any orders yet."}
          </div>
        ) : (
          <ul className="mt-4 space-y-2">
            {rows.map((t) => {
              const other = orderPartyDisplay(t, tab === "selling" ? "buyer" : "seller");
              return (
                <li key={t.id}>
                  <Link
                    href={`/orders/${t.id}`}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 hover:bg-slate-50"
                  >
                    <Avatar
                      name={other.name}
                      src={other.avatarUrl}
                      size={40}
                      rounded={other.kind === "company" ? "md" : "full"}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {t.listing.title}
                      </p>
                      <p className="text-xs text-slate-500">
                        {TX_TYPE_LABEL[t.type]}
                        {t.amount !== null ? ` · ${formatMoney(t.amount)}` : ""} ·{" "}
                        {tab === "selling" ? "from" : "to"} {other.name} ·{" "}
                        {timeAgo(t.createdAt)}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${TX_STATUS[t.status].tone}`}
                    >
                      {TX_STATUS[t.status].label}
                    </span>
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
