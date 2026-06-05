import Link from "next/link";
import { requireAdmin, can, ROLE_LABEL } from "@/lib/admin";
import { getDashboard, RANGES, parseRange } from "@/lib/admin-dashboard";
import { formatMoney } from "@/lib/listings";

/**
 * Admin KPI dashboard (PRD §7C, Module 1). A time-windowed overview: Revenue
 * (admin+ only), Marketplace health, the Leakage signal, and Network/trust, plus
 * a "Needs attention" strip and module shortcuts. Moderators never see financials.
 */
export default async function AdminHome({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const admin = await requireAdmin();
  const role = admin.adminRole;
  const sp = await searchParams;
  const range = parseRange(sp.range);
  const rangeLabel = RANGES.find((r) => r.key === range)!.label.toLowerCase();
  const windowText = range === "all" ? "all time" : `last ${rangeLabel}`;

  const d = await getDashboard(range, can(role, "financials"));

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {admin.name} · {ROLE_LABEL[role]}
          </p>
        </div>
        {/* Global time filter */}
        <div className="flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-white p-1">
          {RANGES.map((r) => (
            <Link
              key={r.key}
              href={r.key === "30d" ? "/admin" : `/admin?range=${r.key}`}
              className={`rounded-md px-3 py-1 text-sm font-medium ${
                r.key === range
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {r.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Needs attention */}
      {(d.attention.pendingVerifications > 0 || d.attention.atRiskListings > 0) && (
        <div className="mt-5 flex flex-wrap gap-3">
          {d.attention.pendingVerifications > 0 && (
            <Link
              href="/admin/verification"
              className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 hover:bg-amber-100"
            >
              <span className="text-xl font-bold text-slate-900">
                {d.attention.pendingVerifications}
              </span>
              <span className="text-sm font-medium text-slate-600">
                verification {d.attention.pendingVerifications === 1 ? "request" : "requests"}
              </span>
            </Link>
          )}
          {d.attention.atRiskListings > 0 && (
            <Link
              href="/admin/listings"
              className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 hover:bg-red-100"
            >
              <span className="text-xl font-bold text-slate-900">
                {d.attention.atRiskListings}
              </span>
              <span className="text-sm font-medium text-slate-600">
                at-risk listings (possible leakage)
              </span>
            </Link>
          )}
        </div>
      )}

      {/* Revenue (admin+ only) */}
      {d.revenue && (
        <Section title="Revenue (the spread)" note={windowText}>
          <Stat label="Realized CX margin" value={formatMoney(d.revenue.realizedMargin)} accent />
          <Stat label="GMV" value={formatMoney(d.revenue.gmv)} />
          <Stat label="Take rate" value={`${d.revenue.takeRatePct}%`} />
          <Stat label="In-flight margin" value={formatMoney(d.revenue.inFlightMargin)} sub="active set-price stock" />
        </Section>
      )}

      {/* Marketplace health */}
      <Section title="Marketplace health" note={windowText}>
        <Stat label="Active listings" value={d.health.activeListings} sub="right now" />
        <Stat label="New listings" value={d.health.newListings} />
        <Stat label="Deals started" value={d.health.dealsStarted} />
        <Stat label="Completion rate" value={`${d.health.completionRatePct}%`} />
        <Stat label="Stock value" value={formatMoney(d.health.stockValue)} sub="active set-price" />
      </Section>

      {/* Leakage signal */}
      <Section
        title="Leakage signal"
        note={`hypothesis · ${windowText}`}
      >
        <Stat
          label="At-risk listings"
          value={d.leakage.atRisk}
          sub={`≥${d.leakage.minViews} views, no sale, closed/stale`}
          danger={d.leakage.atRisk > 0}
        />
        <Stat
          label="Closed: sold elsewhere"
          value={`${d.leakage.soldElsewherePct}%`}
          sub={`${d.leakage.soldElsewhere} of ${d.leakage.closedWithReason} closed w/ reason`}
          danger={d.leakage.soldElsewherePct >= 50}
        />
      </Section>

      {/* Network & trust */}
      <Section title="Network & trust" note={windowText}>
        <Stat label="Users" value={d.network.users} sub={`+${d.network.newUsers} new`} />
        <Stat label="Companies" value={d.network.companies} sub={`+${d.network.newCompanies} new`} />
        <Stat label="Verified users" value={`${d.network.verifiedUserPct}%`} />
        <Stat label="Verified companies" value={`${d.network.verifiedCompanyPct}%`} />
        <Stat label="Review coverage" value={`${d.network.reviewCoveragePct}%`} sub="completed deals reviewed" />
      </Section>

      {/* Deal funnel */}
      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Deal funnel · {windowText}
        </h3>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <FunnelStep label="Listings" value={d.network.funnel.listings} />
          <Arrow />
          <FunnelStep label="Inquiries" value={d.network.funnel.inquiries} />
          <Arrow />
          <FunnelStep label="Deals" value={d.network.funnel.deals} />
          <Arrow />
          <FunnelStep label="Completed" value={d.network.funnel.completed} />
        </div>
      </div>

      {/* Module shortcuts */}
      <h2 className="mt-8 mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
        Modules
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.filter((m) => can(role, m.cap)).map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm"
          >
            <p className="font-semibold text-slate-900">{m.title}</p>
            <p className="mt-1 text-sm text-slate-500">{m.blurb}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

const MODULES = [
  { href: "/admin/verification", title: "Verification", blurb: "Review requests; grant or revoke badges.", cap: "verification" as const },
  { href: "/admin/listings", title: "Listings", blurb: "Moderate, close, recategorize.", cap: "moderation" as const },
  { href: "/admin/users", title: "Users", blurb: "Search, verify, suspend.", cap: "users" as const },
  { href: "/admin/companies", title: "Companies", blurb: "Search, verify, suspend.", cap: "users" as const },
  { href: "/admin/categories", title: "Categories", blurb: "Manage the catalog taxonomy.", cap: "categories" as const },
  { href: "/admin/margins", title: "Margins", blurb: "Per-category margin %.", cap: "margins" as const },
  { href: "/admin/audit", title: "Audit log", blurb: "Every admin action.", cap: "audit" as const },
];

function Section({
  title,
  note,
  children,
}: {
  title: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6">
      <h2 className="mb-2 text-sm font-semibold text-slate-900">
        {title} <span className="font-normal text-slate-400">· {note}</span>
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {children}
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  sub,
  accent,
  danger,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
  danger?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        danger
          ? "border-red-200 bg-red-50"
          : accent
            ? "border-brand-200 bg-brand-50"
            : "border-slate-200 bg-white"
      }`}
    >
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      {sub && <p className="mt-0.5 text-[11px] text-slate-400">{sub}</p>}
    </div>
  );
}

function FunnelStep({ label, value }: { label: string; value: number }) {
  return (
    <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5">
      <span className="font-bold text-slate-900">{value}</span>{" "}
      <span className="text-slate-500">{label}</span>
    </span>
  );
}

function Arrow() {
  return <span className="text-slate-300">→</span>;
}
