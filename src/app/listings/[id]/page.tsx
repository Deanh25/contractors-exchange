import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { Avatar } from "@/components/Avatar";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { messageAboutListingAction } from "@/app/actions/message";
import { createTransactionAction } from "@/app/actions/transaction";
import { resolveListingRecipient, canonicalPair } from "@/lib/messaging";
import { ctaForListing, TX_STATUS } from "@/lib/transactions";
import { tradeLabel } from "@/lib/trades";
import { metroLabel } from "@/lib/locations";
import {
  formatMoney,
  listingBadge,
  photosFromJson,
  listingOwner,
  ownerInclude,
} from "@/lib/listings";

function closesLabel(date: Date | null): string {
  if (!date) return "";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [listing, viewer] = await Promise.all([
    prisma.listing.findUnique({ where: { id }, include: ownerInclude }),
    getCurrentUser(),
  ]);

  if (!listing) notFound();

  const badge = listingBadge(listing.type, listing.tradeKind);
  const photos = photosFromJson(listing.photos);
  const owner = listingOwner(listing);
  const location = metroLabel(listing.city, listing.state);

  // Can the viewer manage this listing? Either they own it as an individual, or
  // they're an owner of the company that owns it (PRD §2 permissions).
  let canManage = !!viewer && listing.ownerUserId === viewer.id;
  if (viewer && !canManage && listing.ownerCompanyId) {
    const m = await prisma.membership.findUnique({
      where: {
        userId_companyId: {
          userId: viewer.id,
          companyId: listing.ownerCompanyId,
        },
      },
    });
    canManage = m?.role === "owner";
  }

  // Deal context (PRD §7). For a buyer: their latest request on this listing and
  // the thread to view it. For the seller: how many requests are pending.
  const sellerId = !canManage ? await resolveListingRecipient(listing) : null;
  let myTx = null;
  let myThreadId: string | null = null;
  if (viewer && sellerId && sellerId !== viewer.id) {
    myTx = await prisma.transaction.findFirst({
      where: { listingId: listing.id, buyerId: viewer.id },
      orderBy: { createdAt: "desc" },
    });
    const { userAId, userBId } = canonicalPair(viewer.id, sellerId);
    const t = await prisma.thread.findFirst({
      where: { userAId, userBId, listingId: listing.id },
    });
    myThreadId = t?.id ?? null;
  }
  const myTxActive =
    myTx &&
    (myTx.status === "pending" ||
      myTx.status === "accepted" ||
      myTx.status === "completed");

  let pendingCount = 0;
  if (canManage) {
    pendingCount = await prisma.transaction.count({
      where: { listingId: listing.id, status: "pending" },
    });
  }

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Link
          href="/listings"
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          ← Back to marketplace
        </Link>

        <div className="mt-4 grid gap-8 md:grid-cols-2">
          {/* Photos */}
          <div>
            <div className="aspect-[4/3] overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
              {photos[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photos[0]}
                  alt={listing.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="grid h-full w-full place-items-center text-slate-300">
                  <span className="text-6xl">🏗️</span>
                </div>
              )}
            </div>
            {photos.length > 1 && (
              <div className="mt-3 grid grid-cols-4 gap-2">
                {photos.slice(1, 5).map((src) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={src}
                    src={src}
                    alt={listing.title}
                    className="aspect-square w-full rounded-md border border-slate-200 object-cover"
                  />
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.tone}`}
              >
                {badge.label}
              </span>
              <span className="rounded-full border border-slate-200 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                {tradeLabel(listing.tradeCategory)}
              </span>
            </div>

            <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
              {listing.title}
            </h1>

            {/* Terms by type */}
            <div className="mt-3">
              {listing.type === "price" && (
                <p className="text-2xl font-extrabold text-slate-900">
                  {formatMoney(listing.price)}
                  {listing.unit && (
                    <span className="ml-1 text-sm font-medium text-slate-500">
                      {listing.unit}
                    </span>
                  )}
                </p>
              )}
              {listing.type === "bid" && (
                <div>
                  <p className="text-2xl font-extrabold text-slate-900">
                    {formatMoney(listing.startReserve)}
                    <span className="ml-1 text-sm font-medium text-slate-500">
                      starting bid
                    </span>
                  </p>
                  {listing.closesAt && (
                    <p className="mt-1 text-sm text-slate-500">
                      Closes {closesLabel(listing.closesAt)}
                    </p>
                  )}
                </div>
              )}
              {listing.type === "trade" && (
                <p className="text-lg font-semibold text-slate-900">
                  Open to {listing.tradeKind === "service" ? "service" : "goods"}{" "}
                  exchange
                </p>
              )}
            </div>

            {location && (
              <p className="mt-3 text-sm text-slate-500">📍 {location}</p>
            )}
            {listing.freightNote && (
              <p className="mt-1 text-sm text-slate-500">
                Freight: {listing.freightNote}
              </p>
            )}

            {/* Actions */}
            <div className="mt-5 space-y-2">
              {canManage ? (
                <>
                  <span className="block rounded-md bg-brand-50 px-3 py-2 text-center text-sm font-medium text-brand-800">
                    This is your listing · status: {listing.status}
                  </span>
                  <Link
                    href="/orders"
                    className="block rounded-md border border-slate-300 px-4 py-2.5 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    View requests
                    {pendingCount > 0 ? ` (${pendingCount} pending)` : ""}
                  </Link>
                </>
              ) : (
                <>
                  {myTxActive && myTx ? (
                    <Link
                      href={myThreadId ? `/messages/${myThreadId}` : "/orders"}
                      className="block rounded-md bg-brand-500 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-brand-600"
                    >
                      View your {TX_STATUS[myTx.status].label.toLowerCase()} request →
                    </Link>
                  ) : viewer ? (
                    <form action={createTransactionAction} className="space-y-2">
                      <input type="hidden" name="listingId" value={listing.id} />
                      {listing.type === "bid" && (
                        <input
                          name="amount"
                          required
                          inputMode="decimal"
                          placeholder={`Your bid (from ${formatMoney(listing.startReserve)})`}
                          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                        />
                      )}
                      <button
                        type="submit"
                        className="block w-full rounded-md bg-brand-500 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-brand-600"
                      >
                        {ctaForListing(listing.type)}
                      </button>
                    </form>
                  ) : (
                    <Link
                      href={`/signin?next=/listings/${listing.id}`}
                      className="block rounded-md bg-brand-500 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-brand-600"
                    >
                      Sign in to{" "}
                      {listing.type === "price"
                        ? "buy"
                        : listing.type === "bid"
                          ? "bid"
                          : "request"}
                    </Link>
                  )}

                  {viewer ? (
                    <form action={messageAboutListingAction}>
                      <input type="hidden" name="listingId" value={listing.id} />
                      <button
                        type="submit"
                        className="block w-full rounded-md border border-slate-300 px-4 py-2.5 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Message seller
                      </button>
                    </form>
                  ) : (
                    <Link
                      href={`/signin?next=/listings/${listing.id}`}
                      className="block rounded-md border border-slate-300 px-4 py-2.5 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Sign in to message seller
                    </Link>
                  )}
                  <p className="text-xs text-slate-400">
                    Completing on-platform keeps the deal protected (escrow is a
                    placeholder in v1 - no money moves yet).
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        {listing.description && (
          <section className="mt-8">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Description
            </h2>
            <p className="whitespace-pre-line text-sm text-slate-700">
              {listing.description}
            </p>
          </section>
        )}

        {/* Seller */}
        {owner && (
          <section className="mt-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Seller
            </h2>
            <Link
              href={owner.href}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 hover:bg-slate-50"
            >
              <Avatar
                name={owner.name}
                src={owner.avatarUrl}
                size={44}
                rounded={owner.kind === "company" ? "md" : "full"}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium text-slate-900">
                    {owner.name}
                  </p>
                  {owner.verified && <VerifiedBadge />}
                </div>
                <p className="text-xs text-slate-500">
                  {owner.kind === "company" ? "Company" : "Individual"}
                  {owner.location ? ` · ${owner.location}` : ""}
                </p>
              </div>
              <span className="text-slate-400">→</span>
            </Link>
          </section>
        )}
      </div>
    </main>
  );
}
