import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Avatar } from "@/components/Avatar";
import { StarInput } from "@/components/StarInput";
import {
  updateTransactionAction,
} from "@/app/actions/transaction";
import { createReviewAction } from "@/app/actions/review";
import { findThread, controlsParty } from "@/lib/messaging";
import { getActingCompanies } from "@/lib/identity";
import { txParties, txPartyInclude, orderPartyDisplay } from "@/lib/orders";
import { timeAgo } from "@/lib/time";
import {
  TX_STATUS,
  TX_TYPE_LABEL,
  isEscrowProtected,
} from "@/lib/transactions";
import {
  formatMoney,
  listingBadge,
  photosFromJson,
  ownerInclude,
} from "@/lib/listings";

function Op({
  id,
  op,
  className,
  children,
}: {
  id: string;
  op: string;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <form action={updateTransactionAction}>
      <input type="hidden" name="transactionId" value={id} />
      <input type="hidden" name="op" value={op} />
      <input type="hidden" name="back" value={`/orders/${id}`} />
      <button type="submit" className={className}>
        {children}
      </button>
    </form>
  );
}

export default async function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser(`/orders/${id}`);

  const tx = await prisma.transaction.findUnique({
    where: { id },
    include: { listing: { include: ownerInclude }, ...txPartyInclude },
  });
  if (!tx) notFound();

  // Access if the viewer controls a side (themselves, or a company they act for).
  const acting = new Set((await getActingCompanies(user.id)).map((c) => c.id));
  const { buyer, seller } = txParties(tx);
  const isBuyer = controlsParty(buyer, user.id, acting);
  const isSeller = controlsParty(seller, user.id, acting);
  if (!isBuyer && !isSeller) notFound();

  const other = orderPartyDisplay(tx, isBuyer ? "seller" : "buyer");
  const listing = tx.listing;
  const photo = photosFromJson(listing.photos)[0];
  const badge = listingBadge(listing.type, listing.tradeKind);
  const status = TX_STATUS[tx.status];
  const protectedDeal = isEscrowProtected(tx.type);

  // Side-channel thread for "Message seller/buyer" (buyer party <-> seller party).
  const thread = await findThread(buyer, seller, tx.listingId);

  const myReview =
    tx.status === "completed"
      ? await prisma.review.findUnique({
          where: {
            transactionId_raterUserId: {
              transactionId: tx.id,
              raterUserId: user.id,
            },
          },
        })
      : null;

  const primaryBtn =
    "rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600";
  const ghostBtn =
    "rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50";

  // Timeline steps from status/dates.
  const steps: { label: string; at: Date; done: boolean }[] = [
    { label: "Requested", at: tx.createdAt, done: true },
  ];
  if (tx.status === "accepted" || tx.status === "completed")
    steps.push({ label: "Accepted by seller", at: tx.updatedAt, done: true });
  if (tx.status === "completed")
    steps.push({ label: "Completed", at: tx.updatedAt, done: true });
  if (tx.status === "declined")
    steps.push({ label: "Declined by seller", at: tx.updatedAt, done: true });
  if (tx.status === "cancelled")
    steps.push({ label: "Cancelled by buyer", at: tx.updatedAt, done: true });

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Link href="/orders" className="text-sm text-slate-500 hover:text-slate-700">
          ← Back to Orders
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Order
          </h1>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.tone}`}
          >
            {status.label}
          </span>
          <span className="text-sm text-slate-400">
            {TX_TYPE_LABEL[tx.type]} · {isBuyer ? "Buying" : "Selling"}
          </span>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-[1fr_280px]">
          <div className="space-y-5">
            {/* Summary */}
            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <Link
                href={`/listings/${listing.id}`}
                className="flex gap-3 hover:opacity-90"
              >
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-slate-100">
                  {photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photo} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-2xl">
                      🏗️
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${badge.tone}`}
                  >
                    {badge.label}
                  </span>
                  <p className="mt-1 truncate text-sm font-semibold text-slate-900">
                    {listing.title}
                  </p>
                  {tx.amount !== null && (
                    <p className="text-sm font-bold text-slate-900">
                      {formatMoney(tx.amount)}
                    </p>
                  )}
                </div>
              </Link>
              {tx.message && (
                <p className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  {tx.message}
                </p>
              )}
            </section>

            {/* Actions */}
            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                {tx.status === "completed" ? "Review" : "Next step"}
              </h2>

              {tx.status === "pending" && isSeller && (
                <div className="flex gap-2">
                  <Op id={tx.id} op="accept" className={primaryBtn}>
                    Accept
                  </Op>
                  <Op id={tx.id} op="decline" className={ghostBtn}>
                    Decline
                  </Op>
                </div>
              )}
              {tx.status === "pending" && isBuyer && (
                <div className="flex items-center gap-2">
                  <Op id={tx.id} op="cancel" className={ghostBtn}>
                    Cancel request
                  </Op>
                  <span className="text-xs text-slate-500">Waiting for the seller.</span>
                </div>
              )}
              {tx.status === "accepted" && (
                <div className="flex items-center gap-2">
                  <Op id={tx.id} op="complete" className={primaryBtn}>
                    Mark completed
                  </Op>
                  <span className="text-xs text-slate-500">
                    {protectedDeal
                      ? "Funds would release from escrow here (stubbed in v1)."
                      : "Arrange the exchange directly."}
                  </span>
                </div>
              )}
              {tx.status === "completed" &&
                (myReview ? (
                  <p className="text-sm text-slate-600">
                    You left a {myReview.stars}-star review. Thanks for keeping it
                    on-platform.
                  </p>
                ) : (
                  <form action={createReviewAction} className="space-y-2">
                    <input type="hidden" name="transactionId" value={tx.id} />
                    <input type="hidden" name="back" value={`/orders/${tx.id}`} />
                    <p className="text-sm font-medium text-slate-700">
                      Rate your deal with {other.name}
                    </p>
                    <StarInput />
                    <textarea
                      name="body"
                      rows={2}
                      placeholder="Optional: how did it go?"
                      className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                    />
                    <button type="submit" className={primaryBtn}>
                      Submit review
                    </button>
                  </form>
                ))}
              {(tx.status === "declined" || tx.status === "cancelled") && (
                <p className="text-sm text-slate-500">
                  This order was {status.label.toLowerCase()}.{" "}
                  <Link
                    href={`/listings/${listing.id}`}
                    className="font-medium text-brand-700 underline"
                  >
                    View the listing
                  </Link>
                </p>
              )}
            </section>

            {/* Timeline */}
            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                Timeline
              </h2>
              <ol className="space-y-2">
                {steps.map((s, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <span className="h-2 w-2 rounded-full bg-brand-500" />
                    <span className="text-slate-700">{s.label}</span>
                    <span className="ml-auto text-xs text-slate-400">
                      {timeAgo(s.at)}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          </div>

          {/* Protection + parties */}
          <aside className="space-y-4">
            <div className="rounded-xl border border-brand-200 bg-brand-50 p-4">
              <p className="text-sm font-semibold text-brand-900">
                {protectedDeal ? "🔒 Buyer protection" : "🤝 Direct trade"}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                {protectedDeal
                  ? "Complete on-platform; escrow would hold funds until completion. Stubbed in v1."
                  : "Connect directly to arrange. No escrow; reputation matters."}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                {isBuyer ? "Seller" : "Buyer"}
              </p>
              <Link
                href={other.href}
                className="flex items-center gap-2 hover:underline"
              >
                <Avatar
                  name={other.name}
                  src={other.avatarUrl}
                  size={36}
                  rounded={other.kind === "company" ? "md" : "full"}
                />
                <span className="text-sm font-medium text-slate-900">
                  {other.name}
                </span>
              </Link>
              {thread && (
                <Link
                  href={`/messages/${thread.id}`}
                  className="mt-3 block rounded-md border border-slate-300 px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Message {isBuyer ? "seller" : "buyer"}
                </Link>
              )}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
