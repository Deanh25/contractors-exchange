import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { WorkspaceShell } from "@/components/WorkspaceShell";
import { getActingContext } from "@/lib/identity";
import { getSellerInsights } from "@/lib/insights";
import type { ListingInsight } from "@/lib/insights";
import type { Party } from "@/lib/messaging";
import { formatMoney } from "@/lib/listings";
import { timeAgo } from "@/lib/time";

/**
 * Marketplace Insights: seller-facing analytics for the current acting identity
 * (you, or a company you act for - switch in the top bar). Shows a rollup plus a
 * per-listing breakdown of Views, Saves, inquiries, offers, and completed deals.
 */
export default async function InsightsPage() {
  const user = await requireUser("/insights");
  const ctx = await getActingContext(user.id);
  const party: Party =
    ctx.type === "company"
      ? { type: "company", id: ctx.company.id }
      : { type: "user", id: user.id };
  const who = ctx.type === "company" ? ctx.company.name : "you";

  const { totals, listings } = await getSellerInsights(party);
  const staleCount = listings.filter((l) => l.stale).length;

  return (
    <main className="flex-1">
      <WorkspaceShell user={user} active="insights">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Marketplace Insights
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          How listings are performing for{" "}
          <span className="font-medium text-slate-700">{who}</span>. Views are
          counted on the listing page (your own views don&apos;t count).
        </p>

        {listings.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-500">
            No listings yet, so there&apos;s nothing to measure.{" "}
            <Link
              href="/listings/new"
              className="font-semibold text-slate-700 underline"
            >
              List something →
            </Link>
          </div>
        ) : (
          <>
            {/* Rollup */}
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <SummaryCard label="Active" value={totals.activeListings} sub={`${totals.listings} total`} />
              <SummaryCard label="Views" value={totals.views} sub={`${totals.views7d} this week`} accent />
              <SummaryCard label="Saves" value={totals.saves} />
              <SummaryCard label="Inquiries" value={totals.inquiries} />
              <SummaryCard label="Offers" value={totals.offers} />
              <SummaryCard label="Completed" value={totals.completed} />
            </div>

            {totals.topListing && (
              <p className="mt-3 text-sm text-slate-500">
                Top performer:{" "}
                <Link
                  href={`/listings/${totals.topListing.id}`}
                  className="font-medium text-slate-700 hover:underline"
                >
                  {totals.topListing.title}
                </Link>{" "}
                ({totals.topListing.views} views).
              </p>
            )}

            {staleCount > 0 && (
              <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {staleCount} active{" "}
                {staleCount === 1 ? "listing has" : "listings have"} had no views
                in the last 7 days. Consider refreshing the photos, title, or price.
              </p>
            )}

            {/* Per-listing breakdown */}
            <h2 className="mt-8 mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              By listing
            </h2>
            <div className="space-y-2">
              {listings.map((l) => (
                <InsightRow key={l.id} l={l} />
              ))}
            </div>
          </>
        )}
      </WorkspaceShell>
    </main>
  );
}

function SummaryCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: number;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        accent ? "border-brand-200 bg-brand-50" : "border-slate-200 bg-white"
      }`}
    >
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      {sub && <p className="mt-0.5 text-[11px] text-slate-400">{sub}</p>}
    </div>
  );
}

const STATUS_TONE: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-800",
  sold: "bg-slate-200 text-slate-700",
  awarded: "bg-slate-200 text-slate-700",
  closed: "bg-slate-200 text-slate-500",
};

function InsightRow({ l }: { l: ListingInsight }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-center gap-3">
        <Link
          href={`/listings/${l.id}`}
          className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-100"
        >
          {l.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={l.photo} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="grid h-full w-full place-items-center text-lg text-slate-300">
              🏗️
            </span>
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <Link
            href={`/listings/${l.id}`}
            className="truncate font-medium text-slate-900 hover:underline"
          >
            {l.title}
          </Link>
          <p className="text-xs text-slate-500">
            {l.price !== null ? `${formatMoney(l.price)} · ` : ""}
            listed {timeAgo(l.createdAt)}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            STATUS_TONE[l.status] ?? "bg-slate-100 text-slate-600"
          }`}
        >
          {l.status}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 sm:grid-cols-6">
        <Metric label="Views" value={l.views} hint={`${l.views7d} this week`} />
        <Metric label="Unique" value={l.uniqueViewers} />
        <Metric label="Saves" value={l.saves} />
        <Metric label="Inquiries" value={l.inquiries} />
        <Metric label="Offers" value={l.offers} />
        <Metric label="Completed" value={l.completed} />
      </div>

      {l.stale && (
        <p className="mt-2 text-xs text-amber-700">
          No views in the last 7 days.
        </p>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <div className="text-center">
      <p className="text-lg font-bold text-slate-900">{value}</p>
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>
      {hint && <p className="text-[10px] text-slate-400">{hint}</p>}
    </div>
  );
}
