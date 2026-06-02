import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Avatar } from "@/components/Avatar";
import { WorkspaceShell } from "@/components/WorkspaceShell";
import { canonicalPair } from "@/lib/messaging";
import { TX_STATUS, TX_TYPE_LABEL } from "@/lib/transactions";
import { formatMoney } from "@/lib/listings";
import { timeAgo } from "@/lib/time";
import type { Transaction, Listing, User } from "@/generated/prisma/client";

type Row = Transaction & { listing: Listing; other: User };
type ThreadFor = (buyerId: string, sellerId: string, listingId: string) => string | null;

function OrderSection({
  title,
  rows,
  role,
  threadFor,
}: {
  title: string;
  rows: Row[];
  role: "buyer" | "seller";
  threadFor: ThreadFor;
}) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h2>
      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
          {role === "buyer"
            ? "You haven't made any requests yet."
            : "No incoming requests yet."}
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((t) => {
            const threadId = threadFor(t.buyerId, t.sellerId, t.listingId);
            const href = threadId
              ? `/messages/${threadId}`
              : `/listings/${t.listingId}`;
            return (
              <li key={t.id}>
                <Link
                  href={href}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 hover:bg-slate-50"
                >
                  <Avatar name={t.other.name} src={t.other.avatarUrl} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {t.listing.title}
                    </p>
                    <p className="text-xs text-slate-500">
                      {TX_TYPE_LABEL[t.type]}
                      {t.amount !== null ? ` · ${formatMoney(t.amount)}` : ""} ·{" "}
                      {role === "buyer" ? "to" : "from"} {t.other.name} ·{" "}
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
    </section>
  );
}

export default async function OrdersPage() {
  const user = await requireUser("/orders");

  const [buyingRaw, sellingRaw, threads] = await Promise.all([
    prisma.transaction.findMany({
      where: { buyerId: user.id },
      include: { listing: true, seller: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.transaction.findMany({
      where: { sellerId: user.id },
      include: { listing: true, buyer: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.thread.findMany({
      where: {
        OR: [{ userAId: user.id }, { userBId: user.id }],
        listingId: { not: null },
      },
    }),
  ]);

  const threadMap = new Map<string, string>();
  for (const t of threads) {
    threadMap.set(`${t.userAId}|${t.userBId}|${t.listingId}`, t.id);
  }
  const threadFor: ThreadFor = (buyerId, sellerId, listingId) => {
    const { userAId, userBId } = canonicalPair(buyerId, sellerId);
    return threadMap.get(`${userAId}|${userBId}|${listingId}`) ?? null;
  };

  const buying: Row[] = buyingRaw.map((t) => ({ ...t, other: t.seller }));
  const selling: Row[] = sellingRaw.map((t) => ({ ...t, other: t.buyer }));

  return (
    <main className="flex-1">
      <WorkspaceShell user={user} active="orders">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Orders</h1>
        <p className="mt-1 text-sm text-slate-500">
          Your on-platform deals. Respond to and complete them inside the
          conversation. Payments are stubbed in v1.
        </p>

        <OrderSection
          title="Selling (incoming)"
          rows={selling}
          role="seller"
          threadFor={threadFor}
        />
        <OrderSection
          title="Buying (your requests)"
          rows={buying}
          role="buyer"
          threadFor={threadFor}
        />
      </WorkspaceShell>
    </main>
  );
}
