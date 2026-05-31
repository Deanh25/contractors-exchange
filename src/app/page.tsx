const FOUR_TYPES = [
  { label: "Set price", blurb: "Fixed price, buy now.", tone: "bg-emerald-100 text-emerald-800" },
  { label: "Open for bid", blurb: "Starting bid + close date.", tone: "bg-amber-100 text-amber-800" },
  { label: "Trade goods", blurb: "Swap equipment & materials.", tone: "bg-sky-100 text-sky-800" },
  { label: "Trade services", blurb: "Exchange work for work.", tone: "bg-violet-100 text-violet-800" },
];

const TRADES = ["Paving", "Concrete", "Electrical", "Plumbing", "HVAC", "Roofing", "General"];

export default function Home() {
  return (
    <main className="flex-1">
      {/* Header */}
      <header className="border-b border-slate-200">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-md bg-amber-500 font-black text-white">
              CX
            </span>
            <span className="text-lg font-bold tracking-tight text-slate-900">
              Contractors Exchange
            </span>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
            Local dev · v1
          </span>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 py-16 sm:py-24">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-amber-600">
          LinkedIn meets a B2B marketplace
        </p>
        <h1 className="max-w-2xl text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl">
          The community marketplace for the construction industry.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-slate-600">
          Buy, sell, auction, or trade goods and services — organized by trade and
          location, inside one feed that mixes listings with industry discussion.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <span className="cursor-not-allowed rounded-md bg-slate-900 px-5 py-3 text-sm font-semibold text-white opacity-60">
            Browse the marketplace →
          </span>
          <span className="cursor-not-allowed rounded-md border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 opacity-60">
            List something
          </span>
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Buttons activate as each module ships. Up next: identity &amp; accounts.
        </p>
      </section>

      {/* Four listing types */}
      <section className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-5xl px-6 py-12">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Four ways to deal
          </h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FOUR_TYPES.map((t) => (
              <div
                key={t.label}
                className="rounded-lg border border-slate-200 bg-white p-5"
              >
                <span
                  className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${t.tone}`}
                >
                  {t.label}
                </span>
                <p className="mt-3 text-sm text-slate-600">{t.blurb}</p>
              </div>
            ))}
          </div>

          <h2 className="mt-12 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Organized by trade
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {TRADES.map((trade) => (
              <span
                key={trade}
                className="rounded-full border border-slate-300 bg-white px-3 py-1 text-sm text-slate-700"
              >
                {trade}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200">
        <div className="mx-auto max-w-5xl px-6 py-6 text-xs text-slate-400">
          Contractors Exchange — running locally at localhost:3000. Payments are
          stubbed in v1.
        </div>
      </footer>
    </main>
  );
}
