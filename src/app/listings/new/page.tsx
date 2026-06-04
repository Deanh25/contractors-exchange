import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createListingAction } from "@/app/actions/listing";
import { ListingTypeFields } from "@/components/ListingTypeFields";
import { LocationPicker } from "@/components/LocationPicker";
import { SearchSelect } from "@/components/SearchSelect";
import { MediaUpload } from "@/components/MediaUpload";
import { getLeafOptions } from "@/lib/categories";
import { LISTING_CONDITIONS } from "@/lib/listings";
import { getAllCategoryMargins, DEFAULT_MARGIN_PCT } from "@/lib/pricing";

const ERRORS: Record<string, string> = {
  title: "A title is required.",
  trade: "Please pick a trade category.",
  type: "Please choose a listing type.",
  owner: "You can only list on behalf of a company you own.",
  price: "Enter a valid price greater than zero.",
  reserve: "Enter a valid starting / reserve bid greater than zero.",
  closes: "Pick a valid closing date and time for the bid.",
};

const inputCls = "w-full rounded-md border border-slate-300 px-3 py-2 text-sm";

export default async function NewListingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireUser("/listings/new");
  const { error } = await searchParams;

  // Owner options: yourself, plus companies you own (PRD §2 permissions).
  const owned = await prisma.membership.findMany({
    where: { userId: user.id, role: "owner" },
    include: { company: true },
    orderBy: { createdAt: "asc" },
  });
  const [margins, tradeOpts] = await Promise.all([
    getAllCategoryMargins(),
    getLeafOptions(),
  ]);

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          List something
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Sell, auction, or trade - tagged by trade and location so the right
          contractors find it. Takes under 2 minutes.
        </p>

        {error && ERRORS[error] && (
          <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {ERRORS[error]}
          </p>
        )}

        <form
          action={createListingAction}
          className="mt-6 space-y-6"
        >
          {/* Who's selling */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              List as
            </label>
            <select name="owner" defaultValue="self" className={inputCls}>
              <option value="self">{user.name} (you)</option>
              {owned.map((m) => (
                <option key={m.company.id} value={m.company.id}>
                  {m.company.name}
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Title
            </label>
            <input
              name="title"
              required
              autoFocus
              placeholder="2019 Bobcat S650 skid steer - 1,200 hrs"
              className={inputCls}
            />
          </div>

          {/* Trade category (single) */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Trade category
            </label>
            <SearchSelect
              name="tradeCategory"
              options={tradeOpts}
              placeholder="Search a trade…"
            />
          </div>

          {/* Location */}
          <LocationPicker
            heading="Location"
            hint="Where the item or work is located."
          />

          {/* Listing type + conditional fields */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Listing type
            </label>
            <ListingTypeFields margins={margins} defaultMargin={DEFAULT_MARGIN_PCT} />
          </div>

          {/* Unit + freight */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Unit <span className="text-slate-400">(optional)</span>
              </label>
              <input
                name="unit"
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
                placeholder="Buyer arranges pickup · can deliver 50 mi"
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Condition <span className="text-slate-400">(optional)</span>
              </label>
              <select name="condition" defaultValue="" className={inputCls}>
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
                placeholder="Bobcat · Graco · Goodman"
                className={inputCls}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Description <span className="text-slate-400">(optional)</span>
            </label>
            <textarea
              name="description"
              rows={5}
              placeholder="Condition, specs, what you're after for a trade…"
              className={inputCls}
            />
          </div>

          {/* Photos & videos */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Photos &amp; videos <span className="text-slate-400">(optional)</span>
            </label>
            <MediaUpload />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              className="rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
            >
              Publish listing
            </button>
            <Link
              href="/listings"
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
