/**
 * One-off, NON-DESTRUCTIVE backfill: set the shared dev password ("cxdev1234")
 * and mark email verified on every existing user that has no password yet, so
 * sign-in works after moving to real email+password auth WITHOUT reseeding (keeps
 * all listings/posts). Safe to re-run. Run: npx tsx scripts/backfill-dev-passwords.ts
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { hashPassword } from "../src/lib/password";

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

async function main() {
  const hash = await hashPassword("cxdev1234");
  const res = await prisma.user.updateMany({
    where: { passwordHash: null },
    data: { passwordHash: hash, emailVerified: new Date() },
  });
  console.log(`Backfilled ${res.count} user(s) with the dev password "cxdev1234".`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
