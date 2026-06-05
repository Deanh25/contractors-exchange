import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ListingCard } from "@/components/ListingCard";
import { DragScroller } from "@/components/DragScroller";
import { ownerInclude } from "@/lib/listings";
import { getCategoryLabelMap, getLeafSlugSet } from "@/lib/categories";

// "Shop by trade" tiles. `img` is a circular product photo (TODO: real photos
// coming from the founder); until then we show an emoji placeholder in the circle.
const SHOP_TRADES: { slug: string; emoji: string; img?: string }[] = [
  { slug: "general-engineering", emoji: "🏗️" },
  { slug: "paving", emoji: "🛣️" },
  { slug: "concrete", emoji: "🧱" },
  { slug: "masonry", emoji: "🪨" },
  { slug: "framing", emoji: "🔨" },
  { slug: "electrical", emoji: "⚡" },
  { slug: "plumbing", emoji: "🚰" },
  { slug: "hvac", emoji: "❄️" },
  { slug: "roofing", emoji: "🏠" },
  { slug: "welding", emoji: "🔥" },
  { slug: "landscaping", emoji: "🌿" },
  { slug: "painting", emoji: "🎨" },
];

const FOUR_TYPES = [
  { label: "Set price", blurb: "Fixed price, buy now.", tone: "bg-emerald-100 text-emerald-800" },
  { label: "Open for bid", blurb: "Starting bid + close date.", tone: "bg-amber-100 text-amber-800" },
  { label: "Trade goods", blurb: "Swap equipment & materials.", tone: "bg-sky-100 text-sky-800" },
  { label: "Trade services", blurb: "Exchange work for work.", tone: "bg-violet-100 text-violet-800" },
];

const VALUE_PROPS = [
  { icon: "pin", title: "Deals near you", body: "Search within 25, 50, or 100 miles. Find equipment and crews in your area, not three states away." },
  { icon: "swap", title: "Buy, bid, or exchange", body: "Set a price, run an auction, or trade goods and services - every kind of deal in one place." },
  { icon: "tag", title: "Sell your surplus", body: "Turn leftover material, overstock, and idle equipment into cash by listing it in under 2 minutes." },
  { icon: "shield", title: "Protected on-platform", body: "Complete deals here with buyer protection. Reviews come from real, finished transactions." },
];

/** Professional line icons (Heroicons outline) for the value props. */
function ValuePropIcon({ name }: { name: string }) {
  const cls = "h-7 w-7 text-brand-600";
  const common = {
    className: cls,
    fill: "none",
    viewBox: "0 0 24 24",
    strokeWidth: 1.6,
    stroke: "currentColor",
    "aria-hidden": true,
  } as const;
  if (name === "pin")
    return (
      <svg {...common}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
      </svg>
    );
  if (name === "swap")
    return (
      <svg {...common}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
      </svg>
    );
  if (name === "tag")
    return (
      <svg {...common}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
      </svg>
    );
  return (
    <svg {...common}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
    </svg>
  );
}

function statLabel(n: number, one: string, many: string): string {
  return `${n.toLocaleString()} ${n === 1 ? one : many}`;
}

export default async function Home() {
  const [listingCount, companyCount, userCount, fresh] = await Promise.all([
    prisma.listing.count({ where: { status: "active" } }),
    prisma.company.count(),
    prisma.user.count(),
    prisma.listing.findMany({
      where: { status: "active" },
      include: ownerInclude,
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
  ]);
  const sellerCount = companyCount + userCount;
  const catLabels = await getCategoryLabelMap();
  const tradeCount = (await getLeafSlugSet()).size;

  return (
    <main className="flex-1">
      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden bg-slate-900">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-500/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/4 h-72 w-72 rounded-full bg-brand-700/20 blur-3xl" />
        <div className="relative mx-auto max-w-5xl px-6 py-16 sm:py-24">
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-brand-400">
            The construction marketplace
          </p>
          <h1 className="max-w-3xl text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-6xl">
            Buy, bid, and exchange across{" "}
            <span className="text-brand-500">every trade.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-slate-300">
            Equipment, materials, and services from contractors near you.
            Organized by trade and location. List in under 2 minutes.
          </p>
          <form method="get" action="/listings" className="mt-8 flex max-w-2xl flex-col gap-2 sm:flex-row">
            <input
              name="q"
              placeholder="Search skid steers, rebar, crews, materials…"
              className="flex-1 rounded-md border border-transparent bg-white px-4 py-3 text-sm text-slate-900 shadow-lg placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button type="submit" className="rounded-md bg-brand-500 px-6 py-3 text-sm font-bold text-white shadow-lg hover:bg-brand-600">
              Search the marketplace
            </button>
          </form>
          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-400">
            <Link href="/listings" className="font-semibold text-white hover:text-brand-400">
              Browse all listings →
            </Link>
            <Link href="/listings/new" className="font-semibold text-white hover:text-brand-400">
              List something →
            </Link>
            <span className="hidden text-slate-600 sm:inline">|</span>
            <span>
              {statLabel(listingCount, "listing", "listings")} · {tradeCount} trades ·{" "}
              {statLabel(sellerCount, "seller", "sellers")}
            </span>
          </div>
        </div>
      </section>

      {/* ===== Shop by trade (circular tiles) ===== */}
      <section className="mx-auto max-w-5xl px-6 py-14">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Shop by trade</h2>
          <Link href="/listings" className="text-sm font-semibold text-brand-700 hover:underline">
            View all trades →
          </Link>
        </div>
        <div className="mt-8 grid grid-cols-3 gap-x-4 gap-y-8 sm:grid-cols-4 lg:grid-cols-6">
          {SHOP_TRADES.map((t) => (
            <Link
              key={t.slug}
              href={`/listings?trade=${t.slug}`}
              className="group flex flex-col items-center gap-2 text-center"
            >
              <span className="grid h-20 w-20 place-items-center overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200 transition group-hover:ring-2 group-hover:ring-brand-400">
                {t.img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.img} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-3xl">{t.emoji}</span>
                )}
              </span>
              <span className="text-sm font-semibold text-slate-700 group-hover:text-brand-700">
                {catLabels[t.slug] ?? t.slug}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ===== Fresh on the marketplace (full-width drag carousel) ===== */}
      {fresh.length > 0 && (
        <section className="border-y border-slate-200 bg-slate-50 py-14">
          <div className="mx-auto max-w-5xl px-6">
            <div className="flex items-end justify-between">
              <div>
                <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
                  Fresh on the marketplace
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  The newest equipment, materials, and services from the trades.
                </p>
              </div>
              <Link href="/listings" className="shrink-0 text-sm font-semibold text-brand-700 hover:underline">
                See all →
              </Link>
            </div>
          </div>
          <DragScroller className="mt-6 px-6 pb-3 sm:px-10">
            {fresh.map((listing) => (
              <div key={listing.id} className="w-56 shrink-0">
                <ListingCard listing={listing} />
              </div>
            ))}
          </DragScroller>
        </section>
      )}

      {/* ===== Sell surplus banner ===== */}
      <section className="mx-auto max-w-5xl px-6 py-8">
        <div className="flex flex-col items-start justify-between gap-4 rounded-2xl bg-slate-900 p-6 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-brand-400">
              Turn surplus into cash
            </p>
            <h3 className="mt-1 text-xl font-extrabold text-white sm:text-2xl">
              Sitting on leftover material or idle equipment?
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-slate-300">
              List overstock, job-site leftovers, and surplus gear - reach
              contractors in your trade and area who need it now.
            </p>
          </div>
          <Link
            href="/listings/new"
            className="shrink-0 rounded-md bg-brand-500 px-6 py-3 text-sm font-bold text-white hover:bg-brand-600"
          >
            List surplus →
          </Link>
        </div>
      </section>

      {/* ===== Four ways to deal ===== */}
      <section className="mx-auto max-w-5xl px-6 py-8">
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Four ways to deal</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FOUR_TYPES.map((t) => (
            <div key={t.label} className="rounded-xl border border-slate-200 bg-white p-5">
              <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${t.tone}`}>
                {t.label}
              </span>
              <p className="mt-3 text-sm text-slate-600">{t.blurb}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== Why contractors use CX ===== */}
      <section className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-5xl px-6 py-14">
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Why contractors use CX
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {VALUE_PROPS.map((v) => (
              <div key={v.title} className="rounded-xl border border-slate-200 bg-white p-5">
                <span className="inline-grid h-12 w-12 place-items-center rounded-lg bg-brand-50">
                  <ValuePropIcon name={v.icon} />
                </span>
                <h3 className="mt-3 font-bold text-slate-900">{v.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Closing CTA band ===== */}
      <section className="bg-brand-500">
        <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-4 px-6 py-12 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-white">
              Ready to move some equipment?
            </h2>
            <p className="mt-1 text-white/90">
              List it in under 2 minutes and reach contractors in your trade and area.
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/listings/new" className="rounded-md bg-white px-5 py-3 text-sm font-bold text-brand-700 hover:bg-brand-50">
              List something
            </Link>
            <Link href="/listings" className="rounded-md border border-white/70 px-5 py-3 text-sm font-bold text-white hover:bg-white/10">
              Browse marketplace
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200">
        <div className="mx-auto max-w-5xl px-6 py-6 text-xs text-slate-400">
          Contractors Exchange - the community marketplace for the construction
          industry. Payments are stubbed in v1.
        </div>
      </footer>
    </main>
  );
}
