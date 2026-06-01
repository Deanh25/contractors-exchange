import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ListingCard } from "@/components/ListingCard";
import { ownerInclude } from "@/lib/listings";
import { TRADES, tradeLabel } from "@/lib/trades";

// Curated "shop by trade" tiles (a spread across categories) -> filtered market.
const SHOP_TRADES: { slug: string; emoji: string }[] = [
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
  { icon: "📍", title: "Deals near you", body: "Search within 25, 50, or 100 miles. Find equipment and crews in your area, not three states away." },
  { icon: "🤝", title: "Buy, bid, or exchange", body: "Set a price, run an auction, or trade goods and services. One platform, every kind of deal." },
  { icon: "🛡️", title: "Protected on-platform", body: "Complete deals here with buyer protection. Reputation and reviews come from real, finished transactions." },
  { icon: "💬", title: "An industry feed", body: "Follow your trades and area for a feed that mixes listings with real contractor conversation." },
];

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
      take: 8,
    }),
  ]);
  const sellerCount = companyCount + userCount;

  return (
    <main className="flex-1">
      {/* ===== Hero (bold, industrial) ===== */}
      <section className="relative overflow-hidden bg-slate-900">
        {/* brand glow accents */}
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

          {/* Hero search */}
          <form
            method="get"
            action="/listings"
            className="mt-8 flex max-w-2xl flex-col gap-2 sm:flex-row"
          >
            <input
              name="q"
              placeholder="Search skid steers, rebar, crews, materials…"
              className="flex-1 rounded-md border border-transparent bg-white px-4 py-3 text-sm text-slate-900 shadow-lg placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button
              type="submit"
              className="rounded-md bg-brand-500 px-6 py-3 text-sm font-bold text-white shadow-lg hover:bg-brand-600"
            >
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
              {statLabel(listingCount, "listing", "listings")} ·{" "}
              {TRADES.length} trades · {statLabel(sellerCount, "seller", "sellers")}
            </span>
          </div>
        </div>
      </section>

      {/* ===== Shop by trade ===== */}
      <section className="mx-auto max-w-5xl px-6 py-14">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Shop by trade
          </h2>
          <Link href="/listings" className="text-sm font-semibold text-brand-700 hover:underline">
            View all trades →
          </Link>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {SHOP_TRADES.map((t) => (
            <Link
              key={t.slug}
              href={`/listings?trade=${t.slug}`}
              className="group flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white p-4 text-center transition hover:border-brand-300 hover:shadow-md"
            >
              <span className="text-3xl transition-transform group-hover:scale-110">
                {t.emoji}
              </span>
              <span className="text-sm font-semibold text-slate-700 group-hover:text-brand-700">
                {tradeLabel(t.slug)}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ===== Fresh on the marketplace ===== */}
      {fresh.length > 0 && (
        <section className="border-y border-slate-200 bg-slate-50">
          <div className="mx-auto max-w-5xl px-6 py-14">
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
            <div className="mt-6 flex snap-x gap-4 overflow-x-auto pb-3">
              {fresh.map((listing) => (
                <div key={listing.id} className="w-56 shrink-0 snap-start">
                  <ListingCard listing={listing} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== Four ways to deal ===== */}
      <section className="mx-auto max-w-5xl px-6 py-14">
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
          Four ways to deal
        </h2>
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
            Why contractors use Contractors Exchange
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {VALUE_PROPS.map((v) => (
              <div key={v.title} className="rounded-xl border border-slate-200 bg-white p-5">
                <span className="text-3xl">{v.icon}</span>
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
            <Link
              href="/listings/new"
              className="rounded-md bg-white px-5 py-3 text-sm font-bold text-brand-700 hover:bg-brand-50"
            >
              List something
            </Link>
            <Link
              href="/listings"
              className="rounded-md border border-white/70 px-5 py-3 text-sm font-bold text-white hover:bg-white/10"
            >
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
