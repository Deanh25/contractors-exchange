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

async function main() {
  console.log("Clearing existing data...");
  await prisma.follow.deleteMany();
  await prisma.post.deleteMany();
  await prisma.listing.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.company.deleteMany();
  await prisma.user.deleteMany();

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
          { userId: tyler.id, role: "member" },
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
    { owner: { ownerCompany: { connect: { id: hughes.id } } }, title: "2019 Bobcat S650 skid steer, 1,200 hrs", tradeCategory: "paving", ...CITY.charlotte, type: "price", price: 38500, unit: "each", freightNote: "Buyer arranges pickup", description: "Well maintained, enclosed cab, two-speed. Fresh service.", createdAt: hoursAgo(4) },
    { owner: { ownerUser: { connect: { id: tyler.id } } }, title: "Pallet of 60lb concrete mix (56 bags)", tradeCategory: "concrete", ...CITY.denver, type: "price", price: 310, unit: "per pallet", description: "Overordered on a job. High-early strength mix.", createdAt: hoursAgo(9) },
    { owner: { ownerCompany: { connect: { id: peachtree.id } } }, title: "3-ton condenser unit, new in box", tradeCategory: "hvac", ...CITY.atlanta, type: "price", price: 1950, unit: "each", description: "14 SEER, never installed. Customer changed scope.", createdAt: hoursAgo(20) },
    { owner: { ownerUser: { connect: { id: brandon.id } } }, title: "Commercial zero-turn mower, 60in deck", tradeCategory: "landscaping", ...CITY.phoenix, type: "price", price: 4200, unit: "each", freightNote: "Can deliver within 50 mi", description: "Upgrading the fleet. Runs great, ~400 hrs.", createdAt: daysAgo(1) },
    { owner: { ownerUser: { connect: { id: whitney.id } } }, title: "Graco airless paint sprayer", tradeCategory: "painting", ...CITY.dallas, type: "price", price: 520, unit: "each", description: "Magnum X7, light use, extra tips included.", createdAt: daysAgo(1) },
    { owner: { ownerCompany: { connect: { id: carolina.id } } }, title: "Bulk 2x4 SPF studs", tradeCategory: "framing", ...CITY.raleigh, type: "price", price: 4.85, unit: "each", freightNote: "Pickup in Raleigh", description: "Kiln-dried, straight stock. Volume discount available.", createdAt: daysAgo(2) },
    { owner: { ownerCompany: { connect: { id: rivera.id } } }, title: "Bucket truck, 40ft boom", tradeCategory: "electrical", ...CITY.phoenix, type: "price", price: 28000, unit: "each", description: "Altec boom, recent inspection. Fleet reduction.", createdAt: daysAgo(2) },
    { owner: { ownerUser: { connect: { id: alicia.id } } }, title: "Roofing nailer + compressor combo", tradeCategory: "roofing", ...CITY.tampa, type: "price", price: 380, unit: "each", description: "Coil nailer, hose, and pancake compressor.", createdAt: daysAgo(3) },
    { owner: { ownerUser: { connect: { id: dean.id } } }, title: "Surplus crushed stone (#57)", tradeCategory: "paving", ...CITY.charlotte, type: "price", price: 24, unit: "per ton", freightNote: "Load-out at our Charlotte yard", description: "Clean #57 stone. Will load your truck.", createdAt: hoursAgo(30) },

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
    await prisma.listing.create({ data: { ...rest, ...owner } });
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

  const [u, c, li, p, f] = await Promise.all([
    prisma.user.count(),
    prisma.company.count(),
    prisma.listing.count(),
    prisma.post.count(),
    prisma.follow.count(),
  ]);
  console.log(
    `Done. ${u} users, ${c} companies, ${li} listings, ${p} posts, ${f} follows.`,
  );
  console.log("Sign in with kerinhughes50@gmail.com to use the Dean Hughes demo account.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
