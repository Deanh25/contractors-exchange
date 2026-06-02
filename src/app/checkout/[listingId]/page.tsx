import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Avatar } from "@/components/Avatar";
import { StarRating } from "@/components/StarRating";
import { createTransactionAction } from "@/app/actions/transaction";
import { resolveListingRecipient } from "@/lib/messaging";
import { getUserRating, getCompanyRating } from "@/lib/reviews";
import {
  formatMoney,
  listingBadge,
  photosFromJson,
  listingOwner,
  ownerInclude,
} from "@/lib/listings";
import { txTypeForListing, isEscrowProtected } from "@/lib/transactions";

const inputCls = "w-full rounded-md border border-slate-300 px-3 py-2 text-sm";

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ listingId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { listingId } = await params;
  const { error } = await searchParams;
  const user = await requireUser(`/checkout/${listingId}`);

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: ownerInclude,
  });
  if (!listing) notFound();

  const sellerId = await resolveListingRecipient(listing);
  if (!sellerId || sellerId === user.id) redirect(`/listings/${listingId}`);

  // If the buyer already has an active deal here, skip straight to its order.
  const existing = await prisma.transaction.findFirst({
    where: { listingId, buyerId: user.id, status: { in: ["pending", "accepted"] } },
  });
  if (existing) redirect(`/orders/${existing.id}`);

  const type = txTypeForListing(listing.type);
  const owner = listingOwner(listing);
  const photo = photosFromJson(listing.photos)[0];
  const badge = listingBadge(listing.type, listing.tradeKind);
  const protectedDeal = isEscrowProtected(type);
  const rating = owner
    ? owner.kind === "company"
      ? await getCompanyRating(owner.id)
      : await getUserRating(owner.id)
    : null;

  const heading =
    type === "purchase"
      ? "Review your order"
      : type === "bid"
        ? "Place a bid"
        : "Request a trade";
  const confirmLabel =
    type === "purchase"
      ? "Confirm request"
      : type === "bid"
        ? "Place bid"
        : "Send trade request";

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Link
          href={`/listings/${listingId}`}
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          ← Back to listing
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
          {heading}
        </h1>

        {error === "bid" && (
          <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Enter a valid bid amount greater than zero.
          </p>
        )}

        <div className="mt-6 grid gap-6 md:grid-cols-[1fr_280px]">
          {/* Order summary + terms */}
          <form action={createTransactionAction} className="space-y-5">
            <input type="hidden" name="listingId" value={listing.id} />

            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                Order summary
              </h2>
              <div className="flex gap-3">
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
                  {type === "purchase" && (
                    <p className="text-sm font-bold text-slate-900">
                      {formatMoney(listing.price)}
                      {listing.unit && (
                        <span className="ml-1 text-xs font-medium text-slate-500">
                          {listing.unit}
                        </span>
                      )}
                    </p>
                  )}
                  {type === "bid" && (
                    <p className="text-xs text-slate-500">
                      Starting bid {formatMoney(listing.startReserve)}
                    </p>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-4">
              {type === "bid" && (
                <div className="mb-3">
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Your bid (USD)
                  </label>
                  <input
                    name="amount"
                    required
                    inputMode="decimal"
                    placeholder="1000.00"
                    className={inputCls}
                  />
                </div>
              )}
              <label className="mb-1 block text-sm font-medium text-slate-700">
                {type === "trade_request"
                  ? "What are you offering?"
                  : "Note to seller"}{" "}
                <span className="text-slate-400">(optional)</span>
              </label>
              <textarea
                name="message"
                rows={3}
                placeholder={
                  type === "trade_request"
                    ? "Describe the goods/services you'd trade…"
                    : "Pickup timing, questions, terms…"
                }
                className={inputCls}
              />
            </section>

            {type === "purchase" && (
              <section className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Item price</span>
                  <span>{formatMoney(listing.price)}</span>
                </div>
                <div className="mt-1 flex justify-between text-slate-600">
                  <span>Platform fee (v1)</span>
                  <span>$0.00</span>
                </div>
                <div className="mt-2 flex justify-between border-t border-slate-100 pt-2 font-bold text-slate-900">
                  <span>Total</span>
                  <span>{formatMoney(listing.price)}</span>
                </div>
              </section>
            )}

            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="rounded-md bg-brand-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-600"
              >
                {confirmLabel}
              </button>
              <Link
                href={`/listings/${listingId}`}
                className="rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </Link>
            </div>
            <p className="text-xs text-slate-400">
              Submitting sends a request to the seller. No money moves in v1.
            </p>
          </form>

          {/* Protection + seller */}
          <aside className="space-y-4">
            <div className="rounded-xl border border-brand-200 bg-brand-50 p-4">
              <p className="text-sm font-semibold text-brand-900">
                {protectedDeal ? "🔒 Buyer protection" : "🤝 Direct trade"}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                {protectedDeal
                  ? "Funds would be held in escrow until you confirm the deal is complete. Escrow is stubbed in v1 - no money moves yet."
                  : "Trades connect both parties to arrange directly. No escrow applies; reputation matters."}
              </p>
            </div>
            {owner && (
              <Link
                href={owner.href}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 hover:bg-slate-50"
              >
                <Avatar
                  name={owner.name}
                  src={owner.avatarUrl}
                  size={40}
                  rounded={owner.kind === "company" ? "md" : "full"}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {owner.name}
                  </p>
                  {rating && rating.count > 0 ? (
                    <StarRating rating={rating.avg} count={rating.count} />
                  ) : (
                    <p className="text-xs text-slate-500">
                      {owner.kind === "company" ? "Company" : "Seller"}
                    </p>
                  )}
                </div>
              </Link>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
