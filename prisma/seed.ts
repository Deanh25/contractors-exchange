/*
 * Demo seed for local testing (PRD §10 seed data, pulled forward for dev).
 * Resets the marketplace/community tables, then inserts a believable network of
 * individuals + companies across several metros and trades, listings of all four
 * types, discussion posts, and follows so the feed/marketplace are populated.
 *
 * Run:  npm run db:seed   (resets and reseeds)
 *
 * NOTE: this clears existing Users/Companies/Listings/Posts/Follows. After a
 * reseed, sign in again with one of the demo emails (e.g. the Dean Hughes one).
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
    insertIdAsNumber: true,
    decimalAsNumber: true,
  });
}

const prisma = new PrismaClient({ adapter: buildAdapter() });

// Standardized cities (city, state, lat, lng) - matches the location dataset.
const CITY = {
  phoenix: { city: "Phoenix", state: "AZ", lat: 33.44838, lng: -112.07404 },
  dallas: { city: "Dallas", state: "TX", lat: 32.78306, lng: -96.80667 },
  atlanta: { city: "Atlanta", state: "GA", lat: 33.749, lng: -84.38798 },
  charlotte: { city: "Charlotte", state: "NC", lat: 35.22709, lng: -80.84313 },
  raleigh: { city: "Raleigh", state: "NC", lat: 35.7721, lng: -78.63861 },
  denver: { city: "Denver", state: "CO", lat: 39.74001, lng: -104.99202 },
  tampa: { city: "Tampa", state: "FL", lat: 27.94752, lng: -82.45843 },
};

const NOW = Date.now();
const hoursAgo = (h: number) => new Date(NOW - h * 3600_000);
const daysAgo = (d: number) => new Date(NOW - d * 86400_000);

/** Canonical participant order for a thread (matches src/lib/messaging.ts). */
// Canonical party columns for a thread. Each party is "user:<id>" or
// "company:<id>"; ordered by that key so a pair maps to one thread.
type SeedParty = { type: "user" | "company"; id: string };
const U = (id: string): SeedParty => ({ type: "user", id });
const C = (id: string): SeedParty => ({ type: "company", id });
function pairParties(p1: SeedParty, p2: SeedParty) {
  const key = (p: SeedParty) => `${p.type}:${p.id}`;
  const [a, b] = key(p1) <= key(p2) ? [p1, p2] : [p2, p1];
  return {
    aType: a.type,
    aUserId: a.type === "user" ? a.id : null,
    aCompanyId: a.type === "company" ? a.id : null,
    bType: b.type,
    bUserId: b.type === "user" ? b.id : null,
    bCompanyId: b.type === "company" ? b.id : null,
  };
}
const pair = (a: string, b: string) => pairParties(U(a), U(b));

// Transaction buyer/seller party columns.
function txCols(buyer: SeedParty, seller: SeedParty) {
  return {
    buyerType: buyer.type,
    buyerUserId: buyer.type === "user" ? buyer.id : null,
    buyerCompanyId: buyer.type === "company" ? buyer.id : null,
    sellerType: seller.type,
    sellerUserId: seller.type === "user" ? seller.id : null,
    sellerCompanyId: seller.type === "company" ? seller.id : null,
  };
}

async function main() {
  console.log("Clearing existing data...");
  await prisma.listingView.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.savedListing.deleteMany();
  await prisma.collection.deleteMany();
  await prisma.follow.deleteMany();
  await prisma.review.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.message.deleteMany();
  await prisma.thread.deleteMany();
  await prisma.post.deleteMany();
  await prisma.listing.deleteMany();
  await prisma.categoryMargin.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.company.deleteMany();
  await prisma.user.deleteMany();

  console.log("Creating category margin bands...");
  // Per-category spread bands (PRD §7B). Others fall back to the code default.
  await prisma.categoryMargin.createMany({
    data: [
      { category: "paving", defaultPct: 12, minPct: 6 },
      { category: "electrical", defaultPct: 14, minPct: 8 },
      { category: "hvac", defaultPct: 13, minPct: 7 },
      { category: "plumbing", defaultPct: 13, minPct: 7 },
      { category: "concrete", defaultPct: 11, minPct: 6 },
      { category: "framing", defaultPct: 12, minPct: 6 },
      { category: "roofing", defaultPct: 12, minPct: 6 },
      { category: "landscaping", defaultPct: 15, minPct: 8 },
    ],
  });

  console.log("Creating users...");
  const jordan = await prisma.user.create({
    data: {
      email: "jordan@riveraelectric.test",
      name: "Jordan Rivera",
      title: "Owner",
      bio: "Licensed electrician, 14 years commercial. Building a low-voltage division.",
      trades: ["electrical", "low-voltage"],
      ...CITY.phoenix,
      verified: true,
    },
  });
  const maria = await prisma.user.create({
    data: {
      email: "maria@lonestarplumbing.test",
      name: "Maria Chen",
      title: "Master Plumber",
      bio: "Commercial and residential plumbing across the DFW metroplex.",
      trades: ["plumbing"],
      ...CITY.dallas,
    },
  });
  // Demo account using the founder's email so signing in lands in a full account.
  const dean = await prisma.user.create({
    data: {
      email: "kerinhughes50@gmail.com",
      name: "Dean Hughes",
      title: "Owner",
      bio: "Paving, grading, and site work. Founder testing Contractors Exchange.",
      trades: ["paving", "general-engineering", "concrete"],
      ...CITY.charlotte,
      verified: true,
    },
  });
  const sam = await prisma.user.create({
    data: {
      email: "sam@peachtreehvac.test",
      name: "Sam Patel",
      title: "Estimator",
      bio: "HVAC and refrigeration, light commercial.",
      trades: ["hvac", "refrigeration"],
      ...CITY.atlanta,
    },
  });
  const tyler = await prisma.user.create({
    data: {
      email: "tyler@example.test",
      name: "Tyler Brooks",
      title: "Foreman",
      bio: "Concrete and masonry, flatwork and foundations.",
      trades: ["concrete", "masonry"],
      ...CITY.denver,
    },
  });
  const alicia = await prisma.user.create({
    data: {
      email: "alicia@summitroofing.test",
      name: "Alicia Gomez",
      title: "Owner",
      bio: "Roofing - shingle, metal, and flat. Storm restoration.",
      trades: ["roofing"],
      ...CITY.tampa,
      verified: true,
    },
  });
  const chris = await prisma.user.create({
    data: {
      email: "chris@carolinaframing.test",
      name: "Chris Nguyen",
      title: "Lead Carpenter",
      bio: "Framing and finish carpentry in the Triangle.",
      trades: ["framing", "cabinet-millwork"],
      ...CITY.raleigh,
    },
  });
  const brandon = await prisma.user.create({
    data: {
      email: "brandon@example.test",
      name: "Brandon Lee",
      title: "Owner",
      bio: "Commercial landscaping and grounds maintenance.",
      trades: ["landscaping"],
      ...CITY.phoenix,
    },
  });
  const whitney = await prisma.user.create({
    data: {
      email: "whitney@example.test",
      name: "Whitney Adams",
      title: "Project Manager",
      bio: "Painting and drywall, commercial tenant improvements.",
      trades: ["painting", "drywall"],
      ...CITY.dallas,
    },
  });
  const marcus = await prisma.user.create({
    data: {
      email: "marcus@example.test",
      name: "Marcus Bell",
      title: "Journeyman Electrician",
      trades: ["electrical", "fire-protection"],
      ...CITY.atlanta,
    },
  });

  console.log("Creating companies...");
  const rivera = await prisma.company.create({
    data: {
      name: "Rivera Electric Co.",
      slug: "rivera-electric-co",
      description: "Commercial electrical and low-voltage systems. Phoenix metro.",
      serviceArea: "Phoenix metro + 100 mi",
      trades: ["electrical", "low-voltage"],
      ...CITY.phoenix,
      verified: true,
      memberships: {
        create: [
          { userId: jordan.id, role: "owner" },
          { userId: marcus.id, role: "member" },
        ],
      },
    },
  });
  const lonestar = await prisma.company.create({
    data: {
      name: "Lone Star Plumbing",
      slug: "lone-star-plumbing",
      description: "Full-service commercial and residential plumbing.",
      trades: ["plumbing"],
      ...CITY.dallas,
      memberships: { create: [{ userId: maria.id, role: "owner" }] },
    },
  });
  const hughes = await prisma.company.create({
    data: {
      name: "Hughes Paving & Grading",
      slug: "hughes-paving-grading",
      description: "Asphalt paving, grading, and site work across the Carolinas.",
      serviceArea: "Charlotte metro + 150 mi",
      trades: ["paving", "general-engineering", "concrete"],
      ...CITY.charlotte,
      verified: true,
      memberships: {
        create: [
          { userId: dean.id, role: "owner" },
          // Tyler is a member but is allowed to act as the company (demo of the
          // per-member canActAsCompany permission).
          { userId: tyler.id, role: "member", canActAsCompany: true },
        ],
      },
    },
  });
  const peachtree = await prisma.company.create({
    data: {
      name: "Peachtree HVAC",
      slug: "peachtree-hvac",
      description: "Heating, cooling, and refrigeration for light commercial.",
      trades: ["hvac", "refrigeration"],
      ...CITY.atlanta,
      memberships: { create: [{ userId: sam.id, role: "owner" }] },
    },
  });
  const summit = await prisma.company.create({
    data: {
      name: "Summit Roofing",
      slug: "summit-roofing",
      description: "Shingle, metal, and flat roofing. Storm restoration specialists.",
      trades: ["roofing"],
      ...CITY.tampa,
      verified: true,
      memberships: { create: [{ userId: alicia.id, role: "owner" }] },
    },
  });
  const carolina = await prisma.company.create({
    data: {
      name: "Carolina Framing LLC",
      slug: "carolina-framing",
      description: "Rough framing and finish carpentry crews, Raleigh-Durham.",
      trades: ["framing", "cabinet-millwork"],
      ...CITY.raleigh,
      memberships: { create: [{ userId: chris.id, role: "owner" }] },
    },
  });

  console.log("Creating listings...");
  const listings = [
    // Set price
    { owner: { ownerCompany: { connect: { id: hughes.id } } }, title: "2019 Bobcat S650 skid steer, 1,200 hrs", tradeCategory: "paving", ...CITY.charlotte, type: "price", price: 38500, unit: "each", condition: "good", manufacturer: "Bobcat", freightNote: "Buyer arranges pickup", description: "Well maintained, enclosed cab, two-speed. Fresh service.", createdAt: hoursAgo(4) },
    { owner: { ownerUser: { connect: { id: tyler.id } } }, title: "Pallet of 60lb concrete mix (56 bags)", tradeCategory: "concrete", ...CITY.denver, type: "price", price: 310, unit: "per pallet", quantityAvailable: 6, condition: "new", manufacturer: "Quikrete", description: "Overordered on a job. High-early strength mix.", createdAt: hoursAgo(9) },
    { owner: { ownerCompany: { connect: { id: peachtree.id } } }, title: "3-ton condenser unit, new in box", tradeCategory: "hvac", ...CITY.atlanta, type: "price", price: 1950, unit: "each", quantityAvailable: 4, condition: "new", manufacturer: "Goodman", description: "14 SEER, never installed. Customer changed scope.", createdAt: hoursAgo(20) },
    { owner: { ownerUser: { connect: { id: brandon.id } } }, title: "Commercial zero-turn mower, 60in deck", tradeCategory: "landscaping", ...CITY.phoenix, type: "price", price: 4200, unit: "each", condition: "good", manufacturer: "Exmark", freightNote: "Can deliver within 50 mi", description: "Upgrading the fleet. Runs great, ~400 hrs.", createdAt: daysAgo(1) },
    { owner: { ownerUser: { connect: { id: whitney.id } } }, title: "Graco airless paint sprayer", tradeCategory: "painting", ...CITY.dallas, type: "price", price: 520, unit: "each", condition: "like_new", manufacturer: "Graco", description: "Magnum X7, light use, extra tips included.", createdAt: daysAgo(1) },
    { owner: { ownerCompany: { connect: { id: carolina.id } } }, title: "Bulk 2x4 SPF studs", tradeCategory: "framing", ...CITY.raleigh, type: "price", price: 4.85, unit: "each", quantityAvailable: 800, freightNote: "Pickup in Raleigh", description: "Kiln-dried, straight stock. Volume discount available.", createdAt: daysAgo(2) },
    { owner: { ownerCompany: { connect: { id: rivera.id } } }, title: "Bucket truck, 40ft boom", tradeCategory: "electrical", ...CITY.phoenix, type: "price", price: 28000, unit: "each", condition: "good", manufacturer: "Altec", description: "Altec boom, recent inspection. Fleet reduction.", createdAt: daysAgo(2) },
    { owner: { ownerUser: { connect: { id: alicia.id } } }, title: "Roofing nailer + compressor combo", tradeCategory: "roofing", ...CITY.tampa, type: "price", price: 380, unit: "each", quantityAvailable: 3, condition: "good", manufacturer: "Bostitch", description: "Coil nailer, hose, and pancake compressor.", createdAt: daysAgo(3) },
    { owner: { ownerUser: { connect: { id: dean.id } } }, title: "Surplus crushed stone (#57)", tradeCategory: "paving", ...CITY.charlotte, type: "price", price: 24, unit: "per ton", quantityAvailable: 40, freightNote: "Load-out at our Charlotte yard", description: "Clean #57 stone. Will load your truck.", createdAt: hoursAgo(30) },

    // Open for bid
    { owner: { ownerCompany: { connect: { id: rivera.id } } }, title: "Reconditioned 200A panels (lot of 10)", tradeCategory: "electrical", ...CITY.phoenix, type: "bid", startReserve: 1200, closesAt: daysAgo(-7), unit: "lot", description: "Tested and labeled. Selling as one lot.", createdAt: hoursAgo(6) },
    { owner: { ownerCompany: { connect: { id: lonestar.id } } }, title: "Job-site office trailer, 20ft", tradeCategory: "plumbing", ...CITY.dallas, type: "bid", startReserve: 2500, closesAt: daysAgo(-10), unit: "each", description: "Solid trailer, AC works. Bid to close out the yard.", createdAt: daysAgo(1) },
    { owner: { ownerCompany: { connect: { id: hughes.id } } }, title: "Asphalt roller, double drum", tradeCategory: "paving", ...CITY.charlotte, type: "bid", startReserve: 9000, closesAt: daysAgo(-5), unit: "each", description: "Vibratory, 47in drums. Recent hydraulic service.", createdAt: daysAgo(2) },

    // Trade - goods
    { owner: { ownerCompany: { connect: { id: summit.id } } }, title: "Surplus architectural shingles (20 sq)", tradeCategory: "roofing", tradeKind: "goods", ...CITY.tampa, type: "trade", description: "Weathered wood color. Trade for synthetic underlayment.", createdAt: hoursAgo(12) },
    { owner: { ownerUser: { connect: { id: sam.id } } }, title: "R-410A recovery machine", tradeCategory: "refrigeration", tradeKind: "goods", ...CITY.atlanta, type: "trade", description: "Works perfectly. Looking to trade for a good vacuum pump.", createdAt: daysAgo(2) },

    // Trade - services
    { owner: { ownerUser: { connect: { id: chris.id } } }, title: "Framing help for finish carpentry", tradeCategory: "framing", tradeKind: "service", ...CITY.raleigh, type: "trade", description: "I'll frame your project in exchange for finish/trim help on mine.", createdAt: hoursAgo(16) },
    { owner: { ownerUser: { connect: { id: marcus.id } } }, title: "Low-voltage rough-in for electrical helper hours", tradeCategory: "low-voltage", tradeKind: "service", ...CITY.atlanta, type: "trade", description: "Trade structured cabling work for journeyman helper hours.", createdAt: daysAgo(3) },
    { owner: { ownerCompany: { connect: { id: carolina.id } } }, title: "Framing crew available - trade for flatwork", tradeCategory: "framing", tradeKind: "service", ...CITY.raleigh, type: "trade", description: "Crew with a gap in the schedule. Trade for concrete flatwork.", createdAt: daysAgo(4) },
  ] as const;

  for (const l of listings) {
    const { owner, ...rest } = l;
    // Spread pricing (PRD §7B): the listed `price` is the PUBLIC buyer price;
    // back out a private seller net at a 12% margin so the demo shows a spread.
    const priceFields =
      rest.type === "price" && "price" in rest && rest.price
        ? {
            sellerNet: Math.round((Number(rest.price) / 1.12) * 100) / 100,
            marginPct: 12,
            agreement: "agreed" as const,
            listedAt: rest.createdAt ?? new Date(),
          }
        : {};
    await prisma.listing.create({ data: { ...rest, ...priceFields, ...owner } });
  }

  console.log("Creating posts...");
  const posts = [
    { author: { authorUser: { connect: { id: jordan.id } } }, body: "Anyone else seeing copper prices jump again this quarter? Bidding jobs is getting tricky.", tradeTag: "electrical", regionTag: "AZ", createdAt: hoursAgo(2) },
    { author: { authorCompany: { connect: { id: summit.id } } }, body: "We're hiring experienced roofers in the Tampa area. Competitive pay, year-round work - reach out.", tradeTag: "roofing", regionTag: "FL", createdAt: hoursAgo(5) },
    { author: { authorUser: { connect: { id: tyler.id } } }, body: "Best mix design for a 6in slab pouring in cold weather next week in Denver? Looking for real-world advice.", tradeTag: "concrete", regionTag: "CO", createdAt: hoursAgo(8) },
    { author: { authorCompany: { connect: { id: hughes.id } } }, body: "Just wrapped a 40,000 sqft lot resurface in Charlotte. Sealcoat goes down in two weeks.", tradeTag: "paving", regionTag: "NC", createdAt: hoursAgo(14) },
    { author: { authorUser: { connect: { id: maria.id } } }, body: "PSA for DFW plumbers: new backflow testing requirements are rolling out. Get your certs current.", tradeTag: "plumbing", regionTag: "TX", createdAt: daysAgo(1) },
    { author: { authorUser: { connect: { id: chris.id } } }, body: "Looking to connect with finish carpenters in the Triangle. Plenty of overflow work to share.", tradeTag: "framing", regionTag: "NC", createdAt: daysAgo(1) },
    { author: { authorCompany: { connect: { id: peachtree.id } } }, body: "Heat pump rebates are back in GA - worth checking eligibility for your customers before quoting.", tradeTag: "hvac", regionTag: "GA", createdAt: daysAgo(2) },
    { author: { authorUser: { connect: { id: brandon.id } } }, body: "Selling off some landscaping equipment as we upgrade the fleet - check my listings if you're in the market.", tradeTag: "landscaping", regionTag: "AZ", createdAt: daysAgo(2) },
    { author: { authorUser: { connect: { id: whitney.id } } }, body: "What's everyone using for low-VOC interior on commercial jobs these days? Spec is getting stricter.", tradeTag: "painting", regionTag: "TX", createdAt: daysAgo(3) },
    { author: { authorCompany: { connect: { id: rivera.id } } }, body: "We're standing up a low-voltage division and hiring techs in Phoenix. DM if you do structured cabling.", tradeTag: "electrical", regionTag: "AZ", createdAt: daysAgo(3) },
  ] as const;

  for (const p of posts) {
    const { author, ...rest } = p;
    await prisma.post.create({ data: { ...rest, ...author } });
  }

  // A post that tags people + a company (so the feed shows mentions, and the
  // tagged parties get a post_mention notification).
  await prisma.post.create({
    data: {
      authorUser: { connect: { id: chris.id } },
      body: "Big thanks to the crews that helped us close out the Raleigh job on time. Couldn't have done it without good partners.",
      tradeTag: "framing",
      regionTag: "NC",
      createdAt: hoursAgo(10),
      tags: {
        create: [
          { taggedCompany: { connect: { id: hughes.id } } },
          { taggedUser: { connect: { id: dean.id } } },
        ],
      },
    },
  });
  await prisma.notification.createMany({
    data: [
      {
        recipientCompanyId: hughes.id,
        actorUserId: chris.id,
        type: "post_mention" as const,
        title: "Chris Nguyen mentioned you in a post",
        body: "Big thanks to the crews that helped us close out the Raleigh job...",
        href: "/feed",
        createdAt: hoursAgo(10),
      },
      {
        recipientUserId: dean.id,
        actorUserId: chris.id,
        type: "post_mention" as const,
        title: "Chris Nguyen mentioned you in a post",
        body: "Big thanks to the crews that helped us close out the Raleigh job...",
        href: "/feed",
        createdAt: hoursAgo(10),
      },
    ],
  });

  console.log("Creating follows...");
  const follows = [
    // Dean's feed: his trades + state + a company and a person.
    { followerUserId: dean.id, targetType: "trade", targetValue: "paving" },
    { followerUserId: dean.id, targetType: "trade", targetValue: "concrete" },
    { followerUserId: dean.id, targetType: "trade", targetValue: "general-engineering" },
    { followerUserId: dean.id, targetType: "location", targetValue: "NC" },
    { followerUserId: dean.id, targetType: "company", targetValue: rivera.id },
    { followerUserId: dean.id, targetType: "user", targetValue: tyler.id },
    // A few others so the network feels alive.
    { followerUserId: jordan.id, targetType: "trade", targetValue: "electrical" },
    { followerUserId: jordan.id, targetType: "location", targetValue: "AZ" },
    { followerUserId: maria.id, targetType: "trade", targetValue: "plumbing" },
    { followerUserId: maria.id, targetType: "location", targetValue: "TX" },
    { followerUserId: chris.id, targetType: "trade", targetValue: "framing" },
    { followerUserId: chris.id, targetType: "company", targetValue: carolina.id },
  ] as const;
  await prisma.follow.createMany({ data: follows as never, skipDuplicates: true });

  console.log("Creating message threads...");
  // A listing-context thread (Dean asking Jordan/Rivera about the panels).
  const panel = await prisma.listing.findFirst({
    where: { ownerCompanyId: rivera.id, type: "bid" },
  });
  // Buyer (Dean) <-> the Rivera COMPANY (demonstrates the shared company inbox);
  // Jordan, a Rivera owner, replies as the company.
  const t1 = await prisma.thread.create({
    data: { ...pairParties(U(dean.id), C(rivera.id)), listingId: panel?.id ?? null },
  });
  await prisma.message.createMany({
    data: [
      { threadId: t1.id, senderUserId: dean.id, body: "Hey, are these panels still available? Interested for a job in Charlotte.", createdAt: hoursAgo(5) },
      { threadId: t1.id, senderUserId: jordan.id, senderCompanyId: rivera.id, body: "Yep, all 10 are available. Reserve is $1,200 for the lot.", createdAt: hoursAgo(4) },
      { threadId: t1.id, senderUserId: dean.id, body: "Great. Can you hold them through the weekend?", createdAt: hoursAgo(3) },
    ],
  });
  await prisma.thread.update({ where: { id: t1.id }, data: { updatedAt: hoursAgo(3) } });

  // A general (no-listing) thread between Dean and Chris.
  const t2 = await prisma.thread.create({
    data: { ...pair(dean.id, chris.id), listingId: null },
  });
  await prisma.message.createMany({
    data: [
      { threadId: t2.id, senderUserId: chris.id, body: "Saw Hughes Paving - do you ever sub out flatwork? Our framing crews are looking to trade.", createdAt: daysAgo(1) },
      { threadId: t2.id, senderUserId: dean.id, body: "We do. Let's find a project to pair up on.", createdAt: hoursAgo(20) },
    ],
  });
  await prisma.thread.update({ where: { id: t2.id }, data: { updatedAt: hoursAgo(20) } });

  console.log("Creating transactions + reviews...");
  // Dean's completed bid on Rivera's panels (lives in the t1 thread). The deal is
  // on Rivera's listing, so the reviews target the PARTIES: Dean reviews the
  // Rivera COMPANY (shows on Rivera's profile), and Rivera reviews Dean (shows on
  // Dean's personal profile, written as the company).
  if (panel) {
    const dealTx = await prisma.transaction.create({
      data: {
        listingId: panel.id,
        ...txCols(U(dean.id), C(rivera.id)),
        type: "bid",
        amount: 1500,
        buyerPrice: 1500,
        status: "completed",
      },
    });
    await prisma.review.createMany({
      data: [
        { transactionId: dealTx.id, raterUserId: dean.id, rateeCompanyId: rivera.id, stars: 5, body: "Panels were exactly as described. Smooth handoff - would buy again." },
        { transactionId: dealTx.id, raterUserId: jordan.id, raterCompanyId: rivera.id, rateeUserId: dean.id, stars: 5, body: "Quick to communicate and paid on time. Great buyer." },
      ],
    });
    // Dean's bell: the review Rivera left him (written as the company).
    await prisma.notification.create({
      data: {
        recipientUserId: dean.id,
        actorUserId: jordan.id,
        actorCompanyId: rivera.id,
        type: "review_new",
        title: "Rivera Electric Co. left you a 5-star review",
        body: "Quick to communicate and paid on time. Great buyer.",
        href: `/u/${dean.id}`,
        transactionId: dealTx.id,
        createdAt: hoursAgo(7),
      },
    });
  }

  // A completed deal ON Hughes Paving's listing, so the Hughes COMPANY gets a
  // review (visible on its Reviews tab + public page), separate from Dean's
  // personal reviews. Marcus buys the Bobcat from Hughes.
  const bobcatListing = await prisma.listing.findFirst({
    where: { ownerCompanyId: hughes.id, type: "price" },
  });
  if (bobcatListing) {
    const hughesTx = await prisma.transaction.create({
      data: {
        listingId: bobcatListing.id,
        ...txCols(U(marcus.id), C(hughes.id)),
        type: "purchase",
        amount: 38500,
        buyerPrice: 38500,
        status: "completed",
      },
    });
    await prisma.review.createMany({
      data: [
        { transactionId: hughesTx.id, raterUserId: marcus.id, rateeCompanyId: hughes.id, stars: 5, body: "Machine was exactly as described and fairly priced. Hughes was easy to work with." },
        { transactionId: hughesTx.id, raterUserId: dean.id, raterCompanyId: hughes.id, rateeUserId: marcus.id, stars: 5, body: "Smooth pickup, paid promptly. Welcome back anytime." },
      ],
    });
    // The Hughes team's shared bell: one company-targeted record.
    await prisma.notification.create({
      data: {
        recipientCompanyId: hughes.id,
        actorUserId: marcus.id,
        type: "review_new",
        title: "Marcus Bell left Hughes Paving & Grading a 5-star review",
        body: "Machine was exactly as described and fairly priced.",
        href: `/company/${hughes.slug}`,
        transactionId: hughesTx.id,
        createdAt: hoursAgo(6),
      },
    });
  }

  console.log("Creating additional sample reviews...");
  // A few more completed sales so several sellers show a star rating on their
  // marketplace cards - while OTHERS (Tyler, Whitney, Carolina, ...) stay
  // unrated to exercise the "No reviews yet" empty state.
  async function seedSale(
    titleLike: string,
    buyerUserId: string,
    stars: number,
    body: string,
    when: Date,
  ) {
    const l = await prisma.listing.findFirst({
      where: { title: { contains: titleLike } },
    });
    if (!l) return;
    const sellerParty: SeedParty = l.ownerCompanyId
      ? C(l.ownerCompanyId)
      : U(l.ownerUserId!);
    const amount = l.price
      ? Number(l.price)
      : l.startReserve
        ? Number(l.startReserve)
        : null;
    const tx = await prisma.transaction.create({
      data: {
        listingId: l.id,
        ...txCols(U(buyerUserId), sellerParty),
        type: l.type === "bid" ? "bid" : "purchase",
        amount,
        buyerPrice: amount,
        status: "completed",
      },
    });
    await prisma.review.create({
      data: {
        transactionId: tx.id,
        raterUserId: buyerUserId,
        rateeUserId: sellerParty.type === "user" ? sellerParty.id : null,
        rateeCompanyId: sellerParty.type === "company" ? sellerParty.id : null,
        stars,
        body,
        createdAt: when,
      },
    });
  }
  // Rivera gets a 2nd review (-> "4.x (2)"); Brandon and Alicia get their first.
  await seedSale("Bucket truck", chris.id, 4, "Boom worked great, clean truck. Smooth deal.", hoursAgo(40));
  await seedSale("zero-turn mower", whitney.id, 5, "Mower started right up, fair price.", daysAgo(2));
  await seedSale("Roofing nailer", sam.id, 5, "Great combo and quick handoff.", daysAgo(3));

  // A pending purchase request TO Dean (so the Dean demo account has an incoming
  // order + a badge on the Orders nav).
  const stone = await prisma.listing.findFirst({
    where: { ownerUserId: dean.id, type: "price" },
  });
  if (stone) {
    const t3 = await prisma.thread.create({
      data: { ...pair(tyler.id, dean.id), listingId: stone.id },
    });
    await prisma.message.create({
      data: {
        threadId: t3.id,
        senderUserId: tyler.id,
        body: `🛒 Requested to buy "${stone.title}" for $24.00 - on-platform, escrow protected.`,
        createdAt: hoursAgo(2),
      },
    });
    await prisma.thread.update({ where: { id: t3.id }, data: { updatedAt: hoursAgo(2) } });
    const stoneTx = await prisma.transaction.create({
      data: {
        listingId: stone.id,
        ...txCols(U(tyler.id), U(dean.id)),
        type: "purchase",
        amount: 24,
        buyerPrice: 24,
        status: "pending",
      },
    });
    // Dean's bell: the incoming buy request (his personal listing).
    await prisma.notification.create({
      data: {
        recipientUserId: dean.id,
        actorUserId: tyler.id,
        type: "order_new",
        title: "Tyler Brooks started a deal",
        body: `Buy now request on "${stone.title}"`,
        href: `/orders/${stoneTx.id}`,
        listingId: stone.id,
        transactionId: stoneTx.id,
        createdAt: hoursAgo(2),
      },
    });
  }

  console.log("Creating company conversations...");
  // Buyers reaching out to Hughes Paving (the Dean demo company). These populate
  // the COMPANY inbox when you switch the top-bar identity to Hughes Paving.
  const bobcat = await prisma.listing.findFirst({
    where: { ownerCompanyId: hughes.id, type: "price" },
  });
  const roller = await prisma.listing.findFirst({
    where: { ownerCompanyId: hughes.id, type: "bid" },
  });
  if (bobcat) {
    // Marcus <-> Hughes Paving; Dean replies as the company. The buyer has the
    // last word, so it shows UNREAD in the Hughes inbox.
    const tc = await prisma.thread.create({
      data: { ...pairParties(U(marcus.id), C(hughes.id)), listingId: bobcat.id },
    });
    await prisma.message.createMany({
      data: [
        { threadId: tc.id, senderUserId: marcus.id, body: `Is the "${bobcat.title}" still available? What's the lowest you'd take?`, createdAt: hoursAgo(6) },
        { threadId: tc.id, senderUserId: dean.id, senderCompanyId: hughes.id, body: "It's available. Price is firm for now, but happy to share the service records.", createdAt: hoursAgo(5) },
        { threadId: tc.id, senderUserId: marcus.id, body: "Sounds good. Could I come look at it this week?", createdAt: hoursAgo(3) },
      ],
    });
    await prisma.thread.update({ where: { id: tc.id }, data: { updatedAt: hoursAgo(3) } });
    // One company-targeted record for the Hughes team's shared bell.
    await prisma.notification.create({
      data: {
        recipientCompanyId: hughes.id,
        actorUserId: marcus.id,
        type: "message",
        title: "New message from Marcus Bell",
        body: "Sounds good. Could I come look at it this week?",
        href: `/messages/${tc.id}`,
        threadId: tc.id,
        createdAt: hoursAgo(3),
      },
    });
  }
  if (roller) {
    // Whitney <-> Hughes Paving; Tyler (a member with canActAsCompany) replies as
    // the company. The company has the last word, so it's read on the Hughes side.
    const td = await prisma.thread.create({
      data: { ...pairParties(U(whitney.id), C(hughes.id)), listingId: roller.id },
    });
    await prisma.message.createMany({
      data: [
        { threadId: td.id, senderUserId: whitney.id, body: `Interested in the "${roller.title}". Is the reserve firm?`, createdAt: daysAgo(1) },
        { threadId: td.id, senderUserId: tyler.id, senderCompanyId: hughes.id, body: "Thanks for the interest! Reserve is firm, but it's a strong machine - recent hydraulic service.", createdAt: hoursAgo(20) },
      ],
    });
    await prisma.thread.update({ where: { id: td.id }, data: { updatedAt: hoursAgo(20) } });

    // A pending bid ON the company's roller (so the Hughes COMPANY orders book
    // has an actionable incoming deal + an Orders badge when acting as Hughes).
    const rollerTx = await prisma.transaction.create({
      data: {
        listingId: roller.id,
        ...txCols(U(whitney.id), C(hughes.id)),
        type: "bid",
        amount: 9500,
        buyerPrice: 9500,
        status: "pending",
      },
    });
    await prisma.notification.create({
      data: {
        recipientCompanyId: hughes.id,
        actorUserId: whitney.id,
        type: "order_new",
        title: "Whitney Adams started a deal",
        body: `Bid on "${roller.title}"`,
        href: `/orders/${rollerTx.id}`,
        listingId: roller.id,
        transactionId: rollerTx.id,
        createdAt: hoursAgo(19),
      },
    });
  }

  console.log("Creating saved listings...");
  // Dean saves a few listings, one filed into a collection - so /saved is populated.
  const charlotteJob = await prisma.collection.create({
    data: { userId: dean.id, name: "For the Charlotte job" },
  });
  const userSaves = await prisma.listing.findMany({
    where: { ownerUserId: { not: dean.id }, ownerCompanyId: null, type: "price" },
    take: 2,
  });
  const companySaves = await prisma.listing.findMany({
    where: { ownerCompanyId: { not: hughes.id }, type: "price" },
    take: 2,
  });
  let filed = false;
  for (const l of [...userSaves, ...companySaves]) {
    await prisma.savedListing.create({
      data: {
        userId: dean.id,
        listingId: l.id,
        // Put the first save into the collection; leave the rest uncategorized.
        collectionId: filed ? null : charlotteJob.id,
      },
    });
    filed = true;
  }

  console.log("Seeding listing views (Marketplace Insights)...");
  // Give Dean's personal listings + the Hughes company storefront a believable
  // spread of views over the past ~2 weeks, attributed to other members (and some
  // anonymous), so /insights shows real numbers for both acting identities.
  const viewers = await prisma.user.findMany({
    where: { id: { not: dean.id } },
    select: { id: true },
    take: 6,
  });
  const insightListings = await prisma.listing.findMany({
    where: { OR: [{ ownerUserId: dean.id }, { ownerCompanyId: hughes.id }] },
    select: { id: true },
  });
  for (let idx = 0; idx < insightListings.length; idx++) {
    const l = insightListings[idx];
    const n = 3 + ((idx * 7) % 18); // 3..20 views, varied per listing
    for (let k = 0; k < n; k++) {
      const anon = k % 3 === 0; // every third view is logged-out
      await prisma.listingView.create({
        data: {
          listingId: l.id,
          viewerUserId: anon ? null : viewers[(idx + k) % viewers.length]?.id ?? null,
          source: "detail",
          createdAt: hoursAgo((k * 11 + idx * 5) % (24 * 14)),
        },
      });
    }
  }

  const [u, c, li, p, f] = await Promise.all([
    prisma.user.count(),
    prisma.company.count(),
    prisma.listing.count(),
    prisma.post.count(),
    prisma.follow.count(),
  ]);
  const [th, ms, tx, rv, nt, sv, vw] = await Promise.all([
    prisma.thread.count(),
    prisma.message.count(),
    prisma.transaction.count(),
    prisma.review.count(),
    prisma.notification.count(),
    prisma.savedListing.count(),
    prisma.listingView.count(),
  ]);
  console.log(
    `Done. ${u} users, ${c} companies, ${li} listings, ${p} posts, ${f} follows, ${th} threads, ${ms} messages, ${tx} transactions, ${rv} reviews, ${nt} notifications, ${sv} saved, ${vw} views.`,
  );
  console.log("Sign in with kerinhughes50@gmail.com to use the Dean Hughes demo account.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
