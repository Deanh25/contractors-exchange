# Contractors Exchange (CX)

A community marketplace for the construction industry — "LinkedIn meets a B2B
marketplace" for contractors across all trades. Users (individuals **and**
companies) can sell, auction (bid), or trade/exchange goods and services,
organized by trade and location, inside a unified feed that mixes marketplace
listings with industry discussion. See [PRD.md](PRD.md) for the full spec.

> **v1 status:** payments are **stubbed** — transactions create records and
> notify the seller, but no money moves (see PRD §7).

## Stack (local-first)

- **Next.js 16** (App Router) + **TypeScript**
- **Tailwind CSS v4**
- **Prisma 7** ORM → **local MySQL/MariaDB** (via XAMPP) using the
  `@prisma/adapter-mariadb` driver adapter
- **Auth.js / NextAuth** dev sign-in (from Step 2) — works fully offline
- Local filesystem image storage (`/public/uploads`) — abstracted for cloud later

The data layer is kept swappable: to move to Postgres later, change the
`datasource` provider in `prisma/schema.prisma`, swap the driver adapter in
[src/lib/prisma.ts](src/lib/prisma.ts), and update `DATABASE_URL`.

## Local setup

**Prerequisites:** Node.js, and a running local MySQL/MariaDB (e.g. start MySQL
in the XAMPP Control Panel).

```bash
# 1. Install dependencies (also runs `prisma generate`)
npm install

# 2. Create your env file and adjust if your MySQL differs from XAMPP defaults
cp .env.example .env

# 3. Create the database (once)
#    XAMPP default login is user "root" with an empty password:
mysql -u root -e "CREATE DATABASE contractors_exchange"

# 4. (From Step 2 onward) apply the schema
npm run db:migrate

# 5. Run the app
npm run dev      # → http://localhost:3000
```

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the dev server at localhost:3000 |
| `npm run build` | Production build |
| `npm run db:migrate` | Create/apply a Prisma migration (dev) |
| `npm run db:push` | Push schema to the DB without a migration |
| `npm run db:studio` | Open Prisma Studio (visual DB browser) |

## Build order

The project is built module by module per PRD §11: (1) scaffold ✅,
(2) identity & accounts ✅, (3) listings ✅, (4) unified feed, (5) messaging,
(6) stubbed transactions, (7) trust, (8) seed data + polish.
