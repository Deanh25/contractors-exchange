/**
 * One-off, NON-DESTRUCTIVE backfill: mark historical deal-event messages as
 * kind=event so they render as centered system chips instead of a chat bubble
 * owned by whoever clicked. Matches the fixed prefixes written by
 * txCreatedMessage / txStatusMessage (src/lib/transactions.ts).
 * Run: npx tsx scripts/backfill-event-messages.ts
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
const PREFIXES = ["🛒", "🔨", "🔁", "✅", "❌", "🎉", "↩️"];

async function main() {
  let total = 0;
  for (const p of PREFIXES) {
    const res = await prisma.message.updateMany({
      where: { kind: "user", body: { startsWith: p } },
      data: { kind: "event" },
    });
    total += res.count;
  }
  console.log(`Marked ${total} historical deal message(s) as kind=event.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
