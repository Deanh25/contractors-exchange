# Contractors Exchange (CX) — MVP Product Requirements Document

> **Drop this file in the project root as `PRD.md`.**
> **Audience:** Claude Code (building in VS Code) + the founder.
> **Goal:** Build a working, clickable v1 of CX — a B2B marketplace + light community for contractors — running locally on the founder's machine, so the founder can see it, then iterate module by module.

---

## 0. What CX Is (one paragraph)

Contractors Exchange (CX) is a community marketplace for the construction industry — "LinkedIn meets a B2B marketplace" for contractors across all trades. Users (individuals and companies) can sell, auction (bid), or trade/exchange goods and services, organized by trade and location, inside a unified feed that mixes marketplace listings with industry discussion. The platform earns a **commission on transactions completed through it** from day one, with broader monetization planned once the user base scales.

---

## 1. The Core Bet

- **Marketplace is primary; community drives retention.** Both ship together because they reinforce each other: people come for industry conversation and discover relevant deals; sellers reach an engaged audience.
- **Revenue from day one:** commission on on-platform transactions (escrow-protected purchases).
- **The central risk is leakage** (parties connecting then dealing off-platform). Design must fight it via escrow/buyer-protection and leakage-aware messaging.

## 2. Account & Identity Model (the spine — build this first)

Dual identity, LinkedIn-style:
- **Individual profile** — a person: name, trade(s), role/title, location, short bio/credentials. Can exist standalone (sole operator).
- **Company page** — a business: name, trades served, service area/locations, logo, description, storefront (its listings), team members. **The commercial entity that sells and holds the payment/commission account.**
- **Association:** an individual can be linked to a company (owner/employee) and act on its behalf. A company can have multiple people. Permissions: company owner can manage page + listings.

> This dual model touches every other feature ("is the person or the company acting?"). It is the highest-complexity piece — get the data model right before building features on top.

## 3. The Marketplace (revenue engine)

- **Organized by trade + location** from day one. Every listing tagged with a **trade category** and **geography**; discovery defaults to relevant trade + near-me.
- **Four listing types (mutually exclusive per listing):**
  1. **Set price** — fixed, buy now.
  2. **Open for bid** — starting/reserve bid + close date.
  3. **Trade / exchange** — goods OR services; "connect & arrange directly," no escrow (see §6).
  4. (Purchase is the escrow-protected completion of set-price and won-bid listings — the commission-earning flow.)
- **Listings owned by** a company page or an individual seller.
- **Listing fields:** title, trade category, location, photos, description, unit, freight/handling note, listing type + its fields.
- Listings appear **both** in structured browse/search **and** in the unified feed.

## 4. The Community Layer (light at launch)

- **Industry discussion posts** — text + optional image, tagged by trade and/or region.
- **Follows/connections** — users follow trades, locations, companies, and people; this shapes their feed.
- **Profiles + company pages** are the identity substrate.
- **NOT at launch:** algorithmic ranking, groups/events, endorsements/skills, articles/long-form.

## 5. The Unified Feed (the front door)

- One scrollable feed mixing **listings + discussion posts**, filtered by the trades and locations the user follows.
- **Simple and filterable** (reverse-chronological + filters by trade/location/type) — **NOT** a complex ranking algorithm in v1.
- Onboarding captures **trade(s) + location** so the feed is relevant on first visit.

## 6. Messaging (v1 — core, leakage-aware)

- **Simple 1:1 direct messaging** between users/companies. Entry points: "Message seller" on a listing, "Arrange exchange" on a trade, "Contact" on a profile/company page.
- **Leakage-aware by design:**
  - Surface the **Buy / Bid / Complete-on-platform** action inside the message thread (path of least resistance = finishing on-platform).
  - Discourage immediate phone/email exchange; on-platform escrow/protection is the incentive to stay.
  - Completed in-thread deals feed the reputation system.
- **Async/simple** (text + optional image). **NOT** group chat, channels, real-time presence, typing/read-receipts at scale.

## 7. Trust & Payments

- **v1 (this build):** NO live payment processing. Purchases/bids create a transaction record and notify the seller; "escrow / buyer protection" is represented in the UI as the intended flow (stub/placeholder), so the experience is designed correctly but money does not move yet. This lets the founder validate the loop before building real payments.
- **Phase 2 (next):** real payments + escrow (card for small deals; invoice/PO/net-terms flow for large). Commission taken on release of escrow.
- **Verification & reputation:** profile + company verification badges; ratings/reviews accrue from completed transactions; trade listings rely on reputation (no escrow).

> Rationale: commission ultimately REQUIRES owning payments, but building escrow before the loop is validated is premature. v1 designs the flow and stubs the money; Phase 2 makes it real.

## 8. UX North Star

- **Dead simple, "Facebook-Marketplace-easy."** List something in under 2 minutes.
- **Truly responsive** — equal quality on phone and desktop.
- **Onboarding:** capture trade(s) + location immediately so the feed/marketplace is relevant from second one.
- **Friction-killers:** passwordless or simple sign-in; auto/quick location; photo from camera or upload; everyone is both buyer and seller (no role switch); guest browsing allowed (account required only to list, message, or transact).
- **Progressive complexity:** keep the core dead-simple; reveal transaction/trust complexity only when completing a purchase.

## 9. Explicitly NOT in v1

- ❌ Live payment processing / real escrow (stubbed — Phase 2)
- ❌ Algorithmic feed ranking
- ❌ Group messaging / real-time chat infra
- ❌ Groups, events, endorsements, long-form articles
- ❌ Freight rate calculation (free-text note only)
- ❌ Government/sealed-bid procurement features
- ❌ Mobile native apps (responsive web only)
- ❌ Advanced analytics dashboards (basic counts only)

## 10. Tech Stack & Local Hosting

> The founder runs this **locally on their own machine as the server** (same self-hosted setup used on a prior e-commerce project — required runtimes already installed). Claude Code: create a **new project in VS Code** and target local-first development.

- **Framework:** Next.js (App Router) + TypeScript
- **Styling:** Tailwind CSS
- **Database:** **local PostgreSQL** (preferred). If Postgres setup is a blocker, fall back to **SQLite** for zero-config local dev — keep the data layer (Prisma) swappable so Postgres can replace it later.
- **ORM:** Prisma (clean schema + migrations; DB-agnostic)
- **Auth:** local-friendly auth (e.g. Auth.js/NextAuth with email magic-link in dev, or a simple dev credential flow) — must work fully offline/local without third-party dependency for v1.
- **Image storage:** local filesystem in dev (e.g. `/public/uploads` or a local volume) — abstract it so cloud storage can swap in later.
- **Run:** `npm run dev`, served at `localhost:3000`.
- **No required external SaaS for v1** — everything runs on the founder's machine.
- **Version control:** Git from the start, pushed to a new GitHub repo (`contractors-exchange`) under the founder's account. Initialize git + `.gitignore` (ignore `.env`, local DB files, `/public/uploads`, `node_modules`, `.next`) before the first push; commit + push after each build step for a clean, rollback-able history.

### Data Model (starting point — Prisma-style)

```
User            id, email, name, role/title, trades[], location {city,state,lat,lng},
                bio, avatar_url, created_at
Company         id, name, slug, trades[], service_area, locations[], logo_url,
                description, created_at
Membership      id, user_id, company_id, role ('owner'|'member')   -- links people to companies
Listing         id, owner_type ('company'|'user'), owner_id, title, trade_category,
                location {city,state,lat,lng}, photos[], description, unit, freight_note,
                type ('price'|'bid'|'trade'),
                price,                       -- if type='price'
                start_reserve, closes_at,    -- if type='bid'
                trade_kind ('goods'|'service'),  -- if type='trade'
                status ('active'|'sold'|'awarded'|'closed'), created_at
Post            id, author_type, author_id, body, image_url, trade_tag, region_tag, created_at
Follow          id, follower_user_id, target_type ('trade'|'location'|'company'|'user'), target_value
Transaction     id, listing_id, buyer_id, type ('purchase'|'bid'|'trade_request'),
                amount, status, message, created_at   -- escrow stubbed in v1
Message         id, thread_id, sender_id, recipient_id, body, image_url, listing_id?, created_at
Review          id, transaction_id, rater_id, ratee_id, stars, body, created_at
```

**Constraints:** enforce listing-type field exclusivity (price set ⇒ bid/trade fields null, etc.) at the schema/validation layer.

### Seed Data
Seed several trades (e.g. Paving, Concrete, Electrical, Plumbing, HVAC, Roofing, General), a handful of companies + individuals across two or three metro areas, and ~10–15 listings spanning all four listing types + a few discussion posts — so the feed and marketplace are populated and demoable immediately.

## 11. Build Order (for Claude Code)

1. Scaffold Next.js + TypeScript + Tailwind + Prisma; choose local DB (Postgres, SQLite fallback); confirm `localhost:3000` runs.
2. **Identity & accounts** — User, Company, Membership; sign-in; profile + company page creation.
3. **Listings** — create-listing form (4 types, trade + location), listing detail, structured browse/search/filter by trade + location.
4. **Unified feed** — listings + posts intermixed, filtered by follows; onboarding captures trade + location.
5. **Messaging** — simple 1:1 threads, leakage-aware (in-thread buy/bid action), entry points from listings/profiles.
6. **Transactions (stubbed)** — purchase/bid/trade-request records + seller notification; escrow/protection represented in UI, money not moved.
7. **Trust** — verification badges (manual flag), ratings/reviews from completed transactions.
8. **Seed + polish** — seed data, responsive pass, dead-simple UX, confirm full core loop end-to-end locally.

## 12. Success Criterion for v1

A locally-running CX where: a user can create an individual profile and a company page, publish a listing of any of the four types tagged by trade + location, browse/filter the marketplace, see a unified feed of listings + posts relevant to followed trades/locations, message another user with the on-platform completion action present, and create a (stubbed) transaction that notifies the seller — all on the founder's machine, demoable, and ready to iterate module by module.
