/**
 * NON-DESTRUCTIVE sample data for testing the order milestone timeline.
 * Creates one listing + one order per timeline scenario (every status, all three
 * deal tracks, and both viewer roles) with STAGGERED per-milestone timestamps so
 * each step shows a distinct time. Existing data is untouched.
 *
 * Re-running deletes only the rows it made previously (they are tagged with the
 * [TL] title prefix), so you always get a clean set.
 *
 * Run: npx tsx scripts/seed-timeline-samples.ts
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

function buildAdapter() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set (see .env.example).");
  const u = new URL(url);
  return new PrismaMariaDb({
    host: u.hostname,
    port: u.port ? Number(u.port) : 3306,
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, ""),
  });
}

const prisma = new PrismaClient({ adapter: buildAdapter() });

const TAG = "[TL]";
const DEAN_EMAIL = "kerinhughes50@gmail.com";
const DAY = 86_400_000;
const ago = (days: number) => new Date(Date.now() - days * DAY);

type Scenario = {
  title: string;
  type: "purchase" | "bid" | "trade_request";
  status: "pending" | "accepted" | "completed" | "declined" | "cancelled";
  /** false = Dean is the SELLER (for the role-flip check). */
  deanIsBuyer: boolean;
  amount: number | null;
  reviewed?: boolean;
};

const SCENARIOS: Scenario[] = [
  // Dean as BUYER, one per state.
  { title: "1 Purchase - PENDING (you are buyer)", type: "purchase", status: "pending", deanIsBuyer: true, amount: 1200 },
  { title: "2 Purchase - ACCEPTED (payment is current)", type: "purchase", status: "accepted", deanIsBuyer: true, amount: 2400 },
  { title: "3 Purchase - COMPLETED, not reviewed", type: "purchase", status: "completed", deanIsBuyer: true, amount: 850 },
  { title: "4 Purchase - COMPLETED + reviewed (all done)", type: "purchase", status: "completed", deanIsBuyer: true, amount: 640, reviewed: true },
  { title: "5 Purchase - DECLINED (red terminal)", type: "purchase", status: "declined", deanIsBuyer: true, amount: 3100 },
  { title: "6 Purchase - CANCELLED (red terminal)", type: "purchase", status: "cancelled", deanIsBuyer: true, amount: 990 },
  // The other two tracks.
  { title: "7 BID - accepted (Bid placed / Awarded labels)", type: "bid", status: "accepted", deanIsBuyer: true, amount: 50000 },
  { title: "8 TRADE - accepted (no Payment, Exchange step)", type: "trade_request", status: "accepted", deanIsBuyer: true, amount: null },
  // Role flip: same pending purchase, but Dean is the seller.
  { title: "9 Purchase - PENDING (you are SELLER)", type: "purchase", status: "pending", deanIsBuyer: false, amount: 1750 },
];

async function main() {
  const dean = await prisma.user.findUnique({ where: { email: DEAN_EMAIL } });
  if (!dean) throw new Error(`No user with email ${DEAN_EMAIL}`);
  const other = await prisma.user.findFirst({
    where: { id: { not: dean.id } },
    orderBy: { createdAt: "asc" },
  });
  if (!other) throw new Error("Need a second user to act as the counterparty.");

  // Clean up a previous run (cascades to its transactions + reviews).
  const removed = await prisma.listing.deleteMany({
    where: { title: { startsWith: TAG } },
  });

  let made = 0;
  for (const s of SCENARIOS) {
    const seller = s.deanIsBuyer ? other : dean;
    const buyer = s.deanIsBuyer ? dean : other;

    const listing = await prisma.listing.create({
      data: {
        title: `${TAG} ${s.title}`,
        tradeCategory: "earthwork-paving",
        type: s.type === "trade_request" ? "trade" : s.type === "bid" ? "bid" : "price",
        tradeKind: s.type === "trade_request" ? "goods" : null,
        status: "active",
        city: "Charlotte",
        state: "NC",
        description: "Sample listing for order-timeline testing.",
        ownerUserId: seller.id,
        price: s.amount,
        quantityAvailable: 1,
      },
    });

    // Staggered so each milestone reads a different time on the rail.
    const createdAt = ago(6);
    const acceptedAt = ago(4);
    const completedAt = ago(2);
    const closedAt = ago(4);

    const tx = await prisma.transaction.create({
      data: {
        listingId: listing.id,
        buyerType: "user",
        buyerUserId: buyer.id,
        sellerType: "user",
        sellerUserId: seller.id,
        type: s.type,
        amount: s.amount,
        buyerPrice: s.amount,
        quantity: 1,
        status: s.status,
        createdAt,
        acceptedAt:
          s.status === "accepted" || s.status === "completed" ? acceptedAt : null,
        completedAt: s.status === "completed" ? completedAt : null,
        closedAt:
          s.status === "declined" || s.status === "cancelled" ? closedAt : null,
      },
    });

    // The reviewed case closes the final step for the viewer (Dean).
    if (s.reviewed) {
      await prisma.review.create({
        data: {
          transactionId: tx.id,
          raterUserId: dean.id,
          rateeUserId: s.deanIsBuyer ? seller.id : buyer.id,
          stars: 5,
          body: "Sample review so the Review step reads as done.",
          createdAt: ago(1),
        },
      });
    }
    made++;
  }

  console.log(
    `Removed ${removed.count} previous ${TAG} listing(s); created ${made} sample order(s).`,
  );
  console.log(`Counterparty for these deals: ${other.name} <${other.email}>`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
