import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin, can, ROLE_LABEL } from "@/lib/admin";

/**
 * Admin home (PRD §7C). The full KPI dashboard lands here in Module 1; for now
 * it's a role-aware launchpad: a "Needs attention" strip (live queue counts) plus
 * cards for the modules this admin's role can reach. Everything is gated by
 * capability, so a moderator sees a different set than a superadmin.
 */
export default async function AdminHome() {
  const admin = await requireAdmin();
  const role = admin.adminRole;

  const pendingPricing = can(role, "pricing")
    ? await prisma.listing.count({ where: { agreement: "pending_admin" } })
    : null;

  const cards: { href: string; title: string; blurb: string; show: boolean }[] = [
    {
      href: "/admin/pricing",
      title: "Pricing queue",
      blurb: "Approve, counter, or reject seller pricing held for review.",
      show: can(role, "pricing"),
    },
    {
      href: "/admin/verification",
      title: "Verification",
      blurb: "Grant or deny the verified badge for users and companies.",
      show: can(role, "verification"),
    },
    {
      href: "/admin/listings",
      title: "Listings",
      blurb: "Moderate any listing: close, reopen, remove, recategorize.",
      show: can(role, "moderation"),
    },
    {
      href: "/admin/users",
      title: "Users",
      blurb: "Search people, verify, and suspend.",
      show: can(role, "users"),
    },
    {
      href: "/admin/companies",
      title: "Companies",
      blurb: "Search companies, verify, and suspend.",
      show: can(role, "users"),
    },
    {
      href: "/admin/margins",
      title: "Margins",
      blurb: "Edit per-category margin bands (affects future listings).",
      show: can(role, "margins"),
    },
    {
      href: "/admin/audit",
      title: "Audit log",
      blurb: "Every admin action, who did it, and when.",
      show: can(role, "audit"),
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">
        Admin dashboard
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        Signed in as{" "}
        <span className="font-medium text-slate-700">{admin.name}</span> ·{" "}
        {ROLE_LABEL[role]}. The full KPI dashboard arrives next; meanwhile, jump
        into a module below.
      </p>

      {/* Needs attention */}
      {pendingPricing !== null && (
        <div className="mt-5">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Needs attention
          </h2>
          <Link
            href="/admin/pricing"
            className={`inline-flex items-center gap-3 rounded-xl border px-4 py-3 ${
              pendingPricing > 0
                ? "border-amber-200 bg-amber-50 hover:bg-amber-100"
                : "border-slate-200 bg-white hover:bg-slate-50"
            }`}
          >
            <span className="text-2xl font-bold text-slate-900">
              {pendingPricing}
            </span>
            <span className="text-sm font-medium text-slate-600">
              {pendingPricing === 1 ? "listing" : "listings"} awaiting pricing
              review
            </span>
          </Link>
        </div>
      )}

      {/* Module cards */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards
          .filter((c) => c.show)
          .map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm"
            >
              <p className="font-semibold text-slate-900">{c.title}</p>
              <p className="mt-1 text-sm text-slate-500">{c.blurb}</p>
            </Link>
          ))}
      </div>
    </div>
  );
}
