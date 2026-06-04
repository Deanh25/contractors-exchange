import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageListing } from "@/lib/listing-access";
import {
  updateListingAction,
  deleteListingAction,
} from "@/app/actions/listing";
import { ListingTypeFields } from "@/components/ListingTypeFields";
import { LocationPicker } from "@/components/LocationPicker";
import { SearchSelect } from "@/components/SearchSelect";
import { MediaUpload } from "@/components/MediaUpload";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { tradeOptions } from "@/lib/trades";
import { listingChoice, photosFromJson, LISTING_CONDITIONS } from "@/lib/listings";
import { getAllMarginBands, DEFAULT_BAND } from "@/lib/pricing";

const ERRORS: Record<string, string> = {
  title: "A title is required.",
  trade: "Please pick a trade category.",
  type: "Please choose a listing type.",
  price: "Enter a valid price greater than zero.",
  reserve: "Enter a valid starting / reserve bid greater than zero.",
  closes: "Pick a valid closing date and time for the bid.",
};

const inputCls = "w-full rounded-md border border-slate-300 px-3 py-2 text-sm";

function toDatetimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function EditListingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const user = await requireUser(`/listings/${id}/edit`);
  const { error } = await searchParams;

  const listing = await prisma.listing.findUnique({ where: { id } });
  if (!listing) notFound();
  if (!(await canManageListing(user.id, listing))) notFound();

  const choice = listingChoice(listing.type, listing.tradeKind);
  const statusDefault = ["active", "sold", "closed"].includes(listing.status)
    ? listing.status
    : "active";
  const bands = await getAllMarginBands();

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <Link
          href={`/listings/${id}`}
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          ← Back to listing
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
          Edit listing
        </h1>

        {error && ERRORS[error] && (
          <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {ERRORS[error]}
          </p>
        )}

        <form action={updateListingAction} className="mt-6 space-y-6">
          <input type="hidden" name="listingId" value={listing.id} />

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Title
            </label>
            <input
              name="title"
              required
              defaultValue={listing.title}
              className={inputCls}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Trade category
            </label>
            <SearchSelect
              name="tradeCategory"
              options={tradeOptions()}
              defaultValue={[listing.tradeCategory]}
              placeholder="Search a trade…"
            />
          </div>

          <LocationPicker
            heading="Location"
            defaultCity={listing.city}
            defaultState={listing.state}
            defaultLat={listing.lat}
            defaultLng={listing.lng}
          />

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Listing type
            </label>
            <ListingTypeFields
              bands={bands}
              defaultBand={DEFAULT_BAND}
              defaultChoice={choice}
              defaultSellerNet={
                listing.sellerNet !== null
                  ? String(Number(listing.sellerNet))
                  : listing.price !== null
                    ? String(Number(listing.price))
                    : ""
              }
              defaultStartReserve={
                listing.startReserve !== null ? String(Number(listing.startReserve)) : ""
              }
              defaultClosesAt={listing.closesAt ? toDatetimeLocal(listing.closesAt) : ""}
              defaultQuantity={String(listing.quantityAvailable)}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Unit <span className="text-slate-400">(optional)</span>
              </label>
              <input
                name="unit"
                defaultValue={listing.unit ?? ""}
                placeholder="each · per ton · per pallet"
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Freight / handling <span className="text-slate-400">(optional)</span>
              </label>
              <input
                name="freightNote"
                defaultValue={listing.freightNote ?? ""}
                placeholder="Buyer arranges pickup · can deliver 50 mi"
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Condition <span className="text-slate-400">(optional)</span>
              </label>
              <select
                name="condition"
                defaultValue={listing.condition ?? ""}
                className={inputCls}
              >
                <option value="">Not specified</option>
                {LISTING_CONDITIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Manufacturer / brand <span className="text-slate-400">(optional)</span>
              </label>
              <input
                name="manufacturer"
                defaultValue={listing.manufacturer ?? ""}
                placeholder="Bobcat · Graco · Goodman"
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Description <span className="text-slate-400">(optional)</span>
            </label>
            <textarea
              name="description"
              rows={5}
              defaultValue={listing.description ?? ""}
              className={inputCls}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Photos &amp; videos
            </label>
            <MediaUpload existing={photosFromJson(listing.photos)} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Status
            </label>
            <select name="status" defaultValue={statusDefault} className={inputCls}>
              <option value="active">Active</option>
              <option value="sold">Sold</option>
              <option value="closed">Closed / withdrawn</option>
            </select>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="submit"
              className="rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
            >
              Save changes
            </button>
            <Link
              href={`/listings/${id}`}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </Link>
          </div>
        </form>

        {/* Danger zone */}
        <div className="mt-10 rounded-xl border border-rose-200 bg-rose-50 p-4">
          <h2 className="text-sm font-semibold text-rose-800">Delete listing</h2>
          <p className="mt-1 text-xs text-rose-700">
            Permanently removes this listing and any deal requests on it. This
            can&apos;t be undone.
          </p>
          <form action={deleteListingAction} className="mt-3">
            <input type="hidden" name="listingId" value={listing.id} />
            <ConfirmSubmit
              message="Delete this listing permanently? This cannot be undone."
              className="rounded-md bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
            >
              Delete listing
            </ConfirmSubmit>
          </form>
        </div>
      </div>
    </main>
  );
}
