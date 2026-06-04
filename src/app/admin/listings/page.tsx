import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireCapability, can } from "@/lib/admin";
import { Avatar } from "@/components/Avatar";
import { formatMoney, photosFromJson } from "@/lib/listings";
import { tradeLabel } from "@/lib/trades";
import { getLeafOptions } from "@/lib/categories";
import { metroLabel } from "@/lib/locations";
import { timeAgo } from "@/lib/time";
import {
  moderateListingStatusAction,
  recategorizeListingAction,
  removeListingAction,
} from "@/app/actions/admin-moderation";
import type { Prisma, ListingStatus } from "@/generated/prisma/client";

const STATUSES: ListingStatus[] = ["active", "sold", "awarded", "closed"];
const STATUS_TONE: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-800",
  sold: "bg-slate-200 text-slate-700",
  awarded: "bg-slate-200 text-slate-700",
  closed: "bg-slate-200 text-slate-500",
};

// Public, non-financial columns only - moderators never load sellerNet/marginPct.
const listingSelect = {
  id: true,
  title: true,
  tradeCategory: true,
  status: true,
  price: true,
  city: true,
  state: true,
  photos: true,
  createdAt: true,
  ownerUser: { select: { id: true, name: true, avatarUrl: true } },
  ownerCompany: { select: { name: true, slug: true, logoUrl: true } },
} satisfies Prisma.ListingSelect;

export default async function AdminListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; error?: string }>;
}) {
  const admin = await requireCapability("moderation");
  const canDelete = can(admin.adminRole, "hardDelete");
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const status = (sp.status ?? "").trim();

  const where: Prisma.ListingWhereInput = {
    ...(q ? { title: { contains: q } } : {}),
    ...(STATUSES.includes(status as ListingStatus)
      ? { status: status as ListingStatus }
      : {}),
  };
  const [listings, leafOpts] = await Promise.all([
    prisma.listing.findMany({
      where,
      select: listingSelect,
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    getLeafOptions(),
  ]);

  const inputCls = "rounded-md border border-slate-300 px-3 py-2 text-sm";

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Listings</h1>
      <p className="mt-1 text-sm text-slate-500">
        Moderate any listing: close, reopen, mark sold, or recategorize.
      </p>

      <form method="get" className="mt-4 flex flex-wrap items-center gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by title…"
          className={`${inputCls} min-w-0 flex-1`}
        />
        <select name="status" defaultValue={status} className={inputCls}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
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

      {sp.error === "confirm" && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          Type DELETE exactly to confirm.
        </p>
      )}

      <div className="mt-4 space-y-2">
        {listings.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-400">
            No listings found.
          </div>
        ) : (
          listings.map((l) => {
            const owner = l.ownerCompany
              ? {
                  name: l.ownerCompany.name,
                  avatar: l.ownerCompany.logoUrl,
                  kind: "company" as const,
                  href: `/company/${l.ownerCompany.slug}`,
                }
              : l.ownerUser
                ? {
                    name: l.ownerUser.name,
                    avatar: l.ownerUser.avatarUrl,
                    kind: "user" as const,
                    href: `/u/${l.ownerUser.id}`,
                  }
                : null;
            const photo = photosFromJson(l.photos)[0] ?? null;
            return (
              <div key={l.id} className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex items-center gap-3">
                  <Link
                    href={`/listings/${l.id}`}
                    className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-100"
                  >
                    {photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photo} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="grid h-full w-full place-items-center text-lg text-slate-300">
                        🏗️
                      </span>
                    )}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/listings/${l.id}`}
                        className="truncate font-medium text-slate-900 hover:underline"
                      >
                        {l.title}
                      </Link>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_TONE[l.status] ?? "bg-slate-100 text-slate-600"}`}
                      >
                        {l.status}
                      </span>
                    </div>
                    <p className="truncate text-xs text-slate-500">
                      {tradeLabel(l.tradeCategory)}
                      {l.price !== null ? ` · ${formatMoney(l.price)}` : ""} ·{" "}
                      {owner ? owner.name : "Unknown"}
                      {metroLabel(l.city, l.state) ? ` · ${metroLabel(l.city, l.state)}` : ""} ·{" "}
                      {timeAgo(l.createdAt)}
                    </p>
                  </div>
                  {owner && (
                    <Avatar
                      name={owner.name}
                      src={owner.avatar}
                      size={32}
                      rounded={owner.kind === "company" ? "md" : "full"}
                    />
                  )}
                </div>

                {/* Moderation actions */}
                <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2">
                  {l.status === "active" ? (
                    <>
                      <SimpleStatus id={l.id} status="sold" label="Mark sold" />
                      <details>
                        <summary className="cursor-pointer list-none rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                          Close
                        </summary>
                        <form
                          action={moderateListingStatusAction}
                          className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2"
                        >
                          <input type="hidden" name="listingId" value={l.id} />
                          <input type="hidden" name="status" value="closed" />
                          <input
                            name="reason"
                            placeholder="Reason (logged)"
                            className="min-w-0 flex-1 rounded-md border border-slate-300 px-2 py-1 text-xs"
                          />
                          <button
                            type="submit"
                            className="rounded-md bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white hover:bg-slate-700"
                          >
                            Close
                          </button>
                        </form>
                      </details>
                    </>
                  ) : (
                    <SimpleStatus id={l.id} status="active" label="Reopen" />
                  )}

                  <details>
                    <summary className="cursor-pointer list-none rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                      Recategorize
                    </summary>
                    <form
                      action={recategorizeListingAction}
                      className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2"
                    >
                      <input type="hidden" name="listingId" value={l.id} />
                      <select
                        name="tradeCategory"
                        defaultValue={l.tradeCategory}
                        className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                      >
                        {leafOpts.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.group}: {o.label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        className="rounded-md bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white hover:bg-slate-700"
                      >
                        Save
                      </button>
                    </form>
                  </details>

                  {canDelete && (
                    <details>
                      <summary className="cursor-pointer list-none rounded-md px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50">
                        Remove
                      </summary>
                      <form
                        action={removeListingAction}
                        className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-2"
                      >
                        <input type="hidden" name="listingId" value={l.id} />
                        <input
                          name="confirm"
                          placeholder="Type DELETE"
                          className="w-28 rounded-md border border-slate-300 px-2 py-1 text-xs"
                        />
                        <input
                          name="reason"
                          placeholder="Reason"
                          className="min-w-0 flex-1 rounded-md border border-slate-300 px-2 py-1 text-xs"
                        />
                        <button
                          type="submit"
                          className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-700"
                        >
                          Permanently remove
                        </button>
                      </form>
                    </details>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function SimpleStatus({
  id,
  status,
  label,
}: {
  id: string;
  status: string;
  label: string;
}) {
  return (
    <form action={moderateListingStatusAction}>
      <input type="hidden" name="listingId" value={id} />
      <input type="hidden" name="status" value={status} />
      <button
        type="submit"
        className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
      >
        {label}
      </button>
    </form>
  );
}
