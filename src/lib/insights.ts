import "server-only";
import { prisma } from "@/lib/prisma";
import { photosFromJson } from "@/lib/listings";
import type { Party } from "@/lib/messaging";
import type { ListingStatus, ListingType } from "@/generated/prisma/client";

/**
 * Marketplace Insights (seller analytics). Per-listing performance KPIs for a
 * seller PARTY (a user, or a company they act for): Views, unique viewers, Saves,
 * inquiries (message threads), offers/requests, and completed deals - plus a
 * rollup. Views come from the ListingView event log (recorded on the detail
 * page); the rest derive from existing rows (SavedListing / Thread / Transaction).
 *
 * Privacy: a seller only ever sees insight for their OWN listings - callers scope
 * by the acting party. The same ListingView source can feed the admin dashboard.
 */

// Repeat views by the same signed-in viewer inside this window are not re-counted,
// so a refresh or back-and-forth doesn't inflate Views.
const DEDUP_WINDOW_MS = 6 * 60 * 60 * 1000;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Record a listing detail view. Never throws - analytics must not break a page. */
export async function recordListingView(
  listingId: string,
  viewerUserId: string | null,
  source = "detail",
): Promise<void> {
  try {
    if (viewerUserId) {
      const since = new Date(Date.now() - DEDUP_WINDOW_MS);
      const recent = await prisma.listingView.findFirst({
        where: { listingId, viewerUserId, createdAt: { gte: since } },
        select: { id: true },
      });
      if (recent) return; // already counted this viewer recently
    }
    await prisma.listingView.create({ data: { listingId, viewerUserId, source } });
  } catch {
    // Swallow: a failed view-count must never surface to the visitor.
  }
}

export type ListingInsight = {
  id: string;
  title: string;
  status: ListingStatus;
  type: ListingType;
  price: number | null;
  quantityAvailable: number;
  photo: string | null;
  createdAt: Date;
  views: number;
  views7d: number;
  uniqueViewers: number;
  saves: number;
  inquiries: number; // distinct message threads about the listing
  offers: number; // purchase / bid / trade requests created on the listing
  completed: number; // deals completed on-platform
  /** Active but with no views in the last 7 days - a nudge to refresh/reprice. */
  stale: boolean;
};

export type InsightTotals = {
  listings: number;
  activeListings: number;
  views: number;
  views7d: number;
  saves: number;
  inquiries: number;
  offers: number;
  completed: number;
  topListing: { id: string; title: string; views: number } | null;
};

export type SellerInsights = {
  totals: InsightTotals;
  listings: ListingInsight[];
};

const EMPTY_TOTALS: InsightTotals = {
  listings: 0,
  activeListings: 0,
  views: 0,
  views7d: 0,
  saves: 0,
  inquiries: 0,
  offers: 0,
  completed: 0,
  topListing: null,
};

type CountRow = { listingId: string | null; _count: { _all: number } };
function countMap(rows: CountRow[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) if (r.listingId) m.set(r.listingId, r._count._all);
  return m;
}

/** All Marketplace Insights for one seller party (their listings + a rollup). */
export async function getSellerInsights(party: Party): Promise<SellerInsights> {
  const ownerWhere =
    party.type === "company"
      ? { ownerCompanyId: party.id }
      : { ownerUserId: party.id };

  const listings = await prisma.listing.findMany({
    where: ownerWhere,
    select: {
      id: true,
      title: true,
      status: true,
      type: true,
      price: true,
      quantityAvailable: true,
      photos: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
  if (listings.length === 0) return { totals: EMPTY_TOTALS, listings: [] };

  const ids = listings.map((l) => l.id);
  const since7 = new Date(Date.now() - WEEK_MS);

  const [viewRows, view7Rows, uniqRows, saveRows, inquiryRows, offerRows, completedRows] =
    await Promise.all([
      prisma.listingView.groupBy({
        by: ["listingId"],
        where: { listingId: { in: ids } },
        _count: { _all: true },
      }),
      prisma.listingView.groupBy({
        by: ["listingId"],
        where: { listingId: { in: ids }, createdAt: { gte: since7 } },
        _count: { _all: true },
      }),
      prisma.listingView.groupBy({
        by: ["listingId", "viewerUserId"],
        where: { listingId: { in: ids }, viewerUserId: { not: null } },
      }),
      prisma.savedListing.groupBy({
        by: ["listingId"],
        where: { listingId: { in: ids } },
        _count: { _all: true },
      }),
      prisma.thread.groupBy({
        by: ["listingId"],
        where: { listingId: { in: ids } },
        _count: { _all: true },
      }),
      prisma.transaction.groupBy({
        by: ["listingId"],
        where: { listingId: { in: ids } },
        _count: { _all: true },
      }),
      prisma.transaction.groupBy({
        by: ["listingId"],
        where: { listingId: { in: ids }, status: "completed" },
        _count: { _all: true },
      }),
    ]);

  const views = countMap(viewRows);
  const views7 = countMap(view7Rows);
  const saves = countMap(saveRows);
  const inquiries = countMap(inquiryRows);
  const offers = countMap(offerRows);
  const completed = countMap(completedRows);

  // Unique viewers = distinct (listing, viewer) rows tallied per listing.
  const uniq = new Map<string, number>();
  for (const r of uniqRows) {
    if (r.listingId) uniq.set(r.listingId, (uniq.get(r.listingId) ?? 0) + 1);
  }

  const rows: ListingInsight[] = listings.map((l) => {
    const v = views.get(l.id) ?? 0;
    const v7 = views7.get(l.id) ?? 0;
    return {
      id: l.id,
      title: l.title,
      status: l.status,
      type: l.type,
      price: l.price === null ? null : Number(l.price),
      quantityAvailable: l.quantityAvailable,
      photo: photosFromJson(l.photos)[0] ?? null,
      createdAt: l.createdAt,
      views: v,
      views7d: v7,
      uniqueViewers: uniq.get(l.id) ?? 0,
      saves: saves.get(l.id) ?? 0,
      inquiries: inquiries.get(l.id) ?? 0,
      offers: offers.get(l.id) ?? 0,
      completed: completed.get(l.id) ?? 0,
      stale: l.status === "active" && v7 === 0,
    };
  });

  // Sort by all-time views (best performers first), then most recent.
  rows.sort((a, b) => b.views - a.views || b.createdAt.getTime() - a.createdAt.getTime());

  const totals: InsightTotals = {
    listings: rows.length,
    activeListings: rows.filter((r) => r.status === "active").length,
    views: sum(rows, "views"),
    views7d: sum(rows, "views7d"),
    saves: sum(rows, "saves"),
    inquiries: sum(rows, "inquiries"),
    offers: sum(rows, "offers"),
    completed: sum(rows, "completed"),
    topListing:
      rows.length > 0 && rows[0].views > 0
        ? { id: rows[0].id, title: rows[0].title, views: rows[0].views }
        : null,
  };

  return { totals, listings: rows };
}

function sum(rows: ListingInsight[], key: keyof ListingInsight): number {
  let n = 0;
  for (const r of rows) n += r[key] as number;
  return n;
}
