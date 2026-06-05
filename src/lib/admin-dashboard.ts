import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Admin KPI dashboard (PRD §7C, Module 1). Computes the headline metrics over a
 * time window: Revenue (the spread - admin/superadmin only), Marketplace health,
 * the Leakage signal (a first-class hypothesis metric with tunable thresholds),
 * and Network/trust. Kept out of the page so the time math (Date.now) runs in
 * server code, not during render.
 */

export type Range = "7d" | "30d" | "90d" | "ytd" | "all";
export const RANGES: { key: Range; label: string }[] = [
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
  { key: "ytd", label: "YTD" },
  { key: "all", label: "All time" },
];
export function parseRange(v: string | undefined): Range {
  return RANGES.some((r) => r.key === v) ? (v as Range) : "30d";
}

// Leakage hypothesis thresholds (tune as real data arrives).
const AT_RISK_VIEWS = 10; // interest...
const STALE_DAYS = 30; // ...with no sale after this long = at risk
const DAY = 86_400_000;

function sinceFor(range: Range): Date | null {
  const now = Date.now();
  if (range === "7d") return new Date(now - 7 * DAY);
  if (range === "30d") return new Date(now - 30 * DAY);
  if (range === "90d") return new Date(now - 90 * DAY);
  if (range === "ytd") return new Date(new Date(now).getFullYear(), 0, 1);
  return null; // all
}

export type Dashboard = {
  revenue: {
    realizedMargin: number;
    gmv: number;
    takeRatePct: number;
    inFlightMargin: number;
  } | null; // null = caller isn't allowed to see financials (moderator)
  health: {
    activeListings: number;
    newListings: number;
    dealsStarted: number;
    completionRatePct: number;
    stockValue: number;
  };
  leakage: {
    atRisk: number;
    closedWithReason: number;
    soldElsewhere: number;
    soldElsewherePct: number;
    minViews: number;
    staleDays: number;
  };
  network: {
    users: number;
    companies: number;
    newUsers: number;
    newCompanies: number;
    verifiedUserPct: number;
    verifiedCompanyPct: number;
    funnel: { listings: number; inquiries: number; deals: number; completed: number };
    reviewCoveragePct: number;
  };
  attention: { pendingVerifications: number; atRiskListings: number };
};

export async function getDashboard(
  range: Range,
  includeFinancials: boolean,
): Promise<Dashboard> {
  const since = sinceFor(range);
  const inWindow = since ? { gte: since } : undefined;
  const createdWhere = inWindow ? { createdAt: inWindow } : {};

  const [
    txCompletedAgg,
    activePriceListings,
    activeListings,
    newListings,
    dealsStarted,
    dealsCompleted,
    closedByReason,
    viewGroups,
    completedListingGroups,
    users,
    companies,
    newUsers,
    newCompanies,
    verifiedUsers,
    verifiedCompanies,
    inquiries,
    reviewedTx,
    pendingVerifications,
  ] = await Promise.all([
    prisma.transaction.aggregate({
      _sum: { margin: true, buyerPrice: true },
      where: { status: "completed", ...createdWhere },
    }),
    prisma.listing.findMany({
      where: { status: "active", type: "price" },
      select: { price: true, sellerNet: true, quantityAvailable: true },
    }),
    prisma.listing.count({ where: { status: "active" } }),
    prisma.listing.count({ where: createdWhere }),
    prisma.transaction.count({ where: createdWhere }),
    prisma.transaction.count({ where: { status: "completed", ...createdWhere } }),
    prisma.listing.groupBy({
      by: ["closeReason"],
      where: { status: "closed", closeReason: { not: null }, ...createdWhere },
      _count: { _all: true },
    }),
    prisma.listingView.groupBy({ by: ["listingId"], _count: { _all: true } }),
    prisma.transaction.groupBy({
      by: ["listingId"],
      where: { status: "completed" },
      _count: { _all: true },
    }),
    prisma.user.count(),
    prisma.company.count(),
    prisma.user.count({ where: createdWhere }),
    prisma.company.count({ where: createdWhere }),
    prisma.user.count({ where: { verified: true } }),
    prisma.company.count({ where: { verified: true } }),
    prisma.thread.count({ where: { listingId: { not: null }, ...createdWhere } }),
    prisma.review.findMany({ select: { transactionId: true }, distinct: ["transactionId"] }),
    prisma.verificationRequest.count({ where: { status: "pending" } }),
  ]);

  // Revenue (the spread).
  const realizedMargin = Number(txCompletedAgg._sum.margin ?? 0);
  const gmv = Number(txCompletedAgg._sum.buyerPrice ?? 0);
  let inFlightMargin = 0;
  let stockValue = 0;
  for (const l of activePriceListings) {
    const price = l.price === null ? 0 : Number(l.price);
    const net = l.sellerNet === null ? null : Number(l.sellerNet);
    if (net !== null) inFlightMargin += price - net;
    stockValue += price * l.quantityAvailable;
  }

  // Leakage: listings with strong interest (views) but no completed sale that are
  // closed or stale - a proxy for deals that may have happened off-platform.
  const completedSet = new Set(
    completedListingGroups.map((g) => g.listingId).filter(Boolean) as string[],
  );
  const highViewIds = viewGroups
    .filter((g) => g._count._all >= AT_RISK_VIEWS && g.listingId)
    .map((g) => g.listingId as string)
    .filter((id) => !completedSet.has(id));
  let atRisk = 0;
  if (highViewIds.length) {
    const staleCutoff = new Date(Date.now() - STALE_DAYS * DAY);
    const cand = await prisma.listing.findMany({
      where: { id: { in: highViewIds } },
      select: { status: true, createdAt: true },
    });
    atRisk = cand.filter(
      (l) =>
        l.status === "closed" ||
        (l.status === "active" && l.createdAt < staleCutoff),
    ).length;
  }
  let soldElsewhere = 0;
  let closedWithReason = 0;
  for (const g of closedByReason) {
    closedWithReason += g._count._all;
    if (g.closeReason === "sold_elsewhere") soldElsewhere += g._count._all;
  }

  const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 1000) / 10 : 0);

  return {
    revenue: includeFinancials
      ? {
          realizedMargin,
          gmv,
          takeRatePct: pct(realizedMargin, gmv),
          inFlightMargin,
        }
      : null,
    health: {
      activeListings,
      newListings,
      dealsStarted,
      completionRatePct: pct(dealsCompleted, dealsStarted),
      stockValue,
    },
    leakage: {
      atRisk,
      closedWithReason,
      soldElsewhere,
      soldElsewherePct: pct(soldElsewhere, closedWithReason),
      minViews: AT_RISK_VIEWS,
      staleDays: STALE_DAYS,
    },
    network: {
      users,
      companies,
      newUsers,
      newCompanies,
      verifiedUserPct: pct(verifiedUsers, users),
      verifiedCompanyPct: pct(verifiedCompanies, companies),
      funnel: {
        listings: newListings,
        inquiries,
        deals: dealsStarted,
        completed: dealsCompleted,
      },
      reviewCoveragePct: pct(reviewedTx.length, dealsCompleted),
    },
    attention: { pendingVerifications, atRiskListings: atRisk },
  };
}
