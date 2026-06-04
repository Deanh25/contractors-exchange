import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { Avatar } from "@/components/Avatar";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { StarRating } from "@/components/StarRating";
import { getUserRating, getCompanyRating } from "@/lib/reviews";
import { messageAboutListingAction } from "@/app/actions/message";
import { updateListingStatusAction } from "@/app/actions/listing";
import { listingOwnerParty, controlsParty, partiesEqual } from "@/lib/messaging";
import { getActingContext, getActingCompanies } from "@/lib/identity";
import { buyerWhere, sellerWhere } from "@/lib/orders";
import { marginAmount } from "@/lib/pricing";
import { SaveButton } from "@/components/SaveButton";
import { ctaForListing, TX_STATUS } from "@/lib/transactions";
import { tradeLabel } from "@/lib/trades";
import { metroLabel } from "@/lib/locations";
import {
  formatMoney,
  listingBadge,
  photosFromJson,
  listingOwner,
  ownerInclude,
  conditionLabel,
} from "@/lib/listings";
import { MediaGallery } from "@/components/MediaGallery";

function StatusBtn({
  id,
  status,
  label,
}: {
  id: string;
  status: string;
  label: string;
}) {
  return (
    <form action={updateListingStatusAction} className="flex-1">
      <input type="hidden" name="listingId" value={id} />
      <input type="hidden" name="status" value={status} />
      <button
        type="submit"
        className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        {label}
      </button>
    </form>
  );
}

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
  const sellerRating = owner
    ? owner.kind === "company"
      ? await getCompanyRating(owner.id)
      : await getUserRating(owner.id)
    : null;
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

  // A listing held for pricing review (§7B) is not public - only its owner sees it.
  if (listing.agreement === "pending_admin" && !canManage) notFound();

  // Deal context (PRD §7). The buyer is the viewer's current acting identity;
  // show their latest request on this listing (unless they own/control it).
  const sellerParty = listingOwnerParty(listing);
  let myTx = null;
  if (viewer && sellerParty) {
    const ctx = await getActingContext(viewer.id);
    const buyerParty =
      ctx.type === "company"
        ? { type: "company" as const, id: ctx.company.id }
        : { type: "user" as const, id: viewer.id };
    const acting = new Set((await getActingCompanies(viewer.id)).map((c) => c.id));
    if (!partiesEqual(buyerParty, sellerParty) && !controlsParty(sellerParty, viewer.id, acting)) {
      myTx = await prisma.transaction.findFirst({
        where: { listingId: listing.id, ...buyerWhere(buyerParty) },
        orderBy: { createdAt: "desc" },
      });
    }
  }
  const myTxActive =
    myTx &&
    (myTx.status === "pending" ||
      myTx.status === "accepted" ||
      myTx.status === "completed");

  // For the seller (owner): how many requests are pending on this listing.
  let pendingCount = 0;
  if (canManage && sellerParty) {
    pendingCount = await prisma.transaction.count({
      where: { listingId: listing.id, ...sellerWhere(sellerParty), status: "pending" },
    });
  }

  // Viewer's saved state + collections (non-owners only; owners don't save
  // their own listing) for the save-to-collection menu.
  let isSaved = false;
  let savedCollectionId: string | null = null;
  let viewerCollections: { id: string; name: string }[] = [];
  if (viewer && !canManage) {
    const [s, cols] = await Promise.all([
      prisma.savedListing.findUnique({
        where: { userId_listingId: { userId: viewer.id, listingId: listing.id } },
        select: { collectionId: true },
      }),
      prisma.collection.findMany({
        where: { userId: viewer.id },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
    ]);
    isSaved = !!s;
    savedCollectionId = s?.collectionId ?? null;
    viewerCollections = cols;
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
          {/* Photos / videos - browsable gallery */}
          <div>
            <MediaGallery media={photos} title={listing.title} />
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
            {(conditionLabel(listing.condition) || listing.manufacturer) && (
              <p className="mt-1 text-sm text-slate-500">
                {[conditionLabel(listing.condition), listing.manufacturer]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
            {listing.freightNote && (
              <p className="mt-1 text-sm text-slate-500">
                Freight: {listing.freightNote}
              </p>
            )}

            {/* Spread breakdown - owner only (private; never shown to buyers). */}
            {canManage &&
              listing.type === "price" &&
              listing.sellerNet !== null && (
                <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Your pricing (private)
                  </p>
                  <div className="flex justify-between text-slate-600">
                    <span>Your net</span>
                    <span className="font-medium text-slate-900">
                      {formatMoney(listing.sellerNet)}
                    </span>
                  </div>
                  <div className="mt-0.5 flex justify-between text-slate-600">
                    <span>
                      CX margin
                      {listing.marginPct !== null
                        ? ` (${listing.marginPct.toFixed(1)}%)`
                        : ""}
                    </span>
                    <span>{formatMoney(marginAmount(listing) ?? 0)}</span>
                  </div>
                  <div className="mt-1 flex justify-between border-t border-slate-200 pt-1 font-semibold text-slate-900">
                    <span>Buyer pays</span>
                    <span>{formatMoney(listing.price)}</span>
                  </div>
                  {listing.agreement === "pending_admin" && (
                    <p className="mt-2 rounded bg-amber-50 px-2 py-1 text-xs text-amber-800">
                      Held for a quick pricing review - not visible to buyers yet.
                    </p>
                  )}
                </div>
              )}

            {/* Actions */}
            <div className="mt-5 space-y-2">
              {canManage ? (
                <>
                  <span className="block rounded-md bg-brand-50 px-3 py-2 text-center text-sm font-medium text-brand-800">
                    This is your listing · status: {listing.status}
                  </span>
                  <div className="flex gap-2">
                    <Link
                      href={`/listings/${listing.id}/edit`}
                      className="flex-1 rounded-md bg-brand-500 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-brand-600"
                    >
                      Edit listing
                    </Link>
                    <Link
                      href="/orders"
                      className="flex-1 rounded-md border border-slate-300 px-4 py-2.5 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Requests{pendingCount > 0 ? ` (${pendingCount})` : ""}
                    </Link>
                  </div>
                  <div className="flex gap-2">
                    {listing.status === "active" ? (
                      <>
                        <StatusBtn id={listing.id} status="sold" label="Mark sold" />
                        <StatusBtn id={listing.id} status="closed" label="Close" />
                      </>
                    ) : (
                      <StatusBtn id={listing.id} status="active" label="Reactivate" />
                    )}
                  </div>
                </>
              ) : (
                <>
                  {myTxActive && myTx ? (
                    <Link
                      href={`/orders/${myTx.id}`}
                      className="block rounded-md bg-brand-500 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-brand-600"
                    >
                      View your {TX_STATUS[myTx.status].label.toLowerCase()} order →
                    </Link>
                  ) : viewer ? (
                    <Link
                      href={`/checkout/${listing.id}`}
                      className="block rounded-md bg-brand-500 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-brand-600"
                    >
                      {ctaForListing(listing.type)}
                    </Link>
                  ) : (
                    <Link
                      href={`/signin?next=/checkout/${listing.id}`}
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
                    <div className="flex gap-2">
                      <form
                        action={messageAboutListingAction}
                        className="flex-1"
                      >
                        <input type="hidden" name="listingId" value={listing.id} />
                        <button
                          type="submit"
                          className="block w-full rounded-md border border-slate-300 px-4 py-2.5 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Message seller
                        </button>
                      </form>
                      <div className="flex-1">
                        <SaveButton
                          listingId={listing.id}
                          saved={isSaved}
                          currentCollectionId={savedCollectionId}
                          collections={viewerCollections}
                          variant="button"
                        />
                      </div>
                    </div>
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
                {sellerRating && sellerRating.count > 0 && (
                  <div className="mt-1">
                    <StarRating rating={sellerRating.avg} count={sellerRating.count} />
                  </div>
                )}
              </div>
              <span className="text-slate-400">→</span>
            </Link>
          </section>
        )}
      </div>
    </main>
  );
}
