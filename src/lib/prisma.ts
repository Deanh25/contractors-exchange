import { PrismaClient } from "@/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

/**
 * Prisma 7 uses a driver adapter for the runtime connection. XAMPP's "MySQL" is
 * actually MariaDB, so we use @prisma/adapter-mariadb. We parse DATABASE_URL into
 * an explicit pool config so it works regardless of the URL scheme (mysql://).
 *
 * Swapping to Postgres later means: change the datasource provider in
 * schema.prisma, install @prisma/adapter-pg, and build the adapter here instead.
 */
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
    // MariaDB driver returns BigInt for some integer columns by default; keep
    // them as JS numbers for ergonomic use across the app.
    insertIdAsNumber: true,
    decimalAsNumber: true,
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter: buildAdapter() });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
