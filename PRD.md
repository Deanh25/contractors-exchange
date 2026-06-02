# Contractors Exchange (CX) - MVP Product Requirements Document

> **Drop this file in the project root as `PRD.md`.**
> **Audience:** Claude Code (building in VS Code) + the founder.
> **Goal:** Build a working, clickable v1 of CX - a B2B marketplace + light community for contractors - running locally on the founder's machine, so the founder can see it, then iterate module by module.

---

## 0. What CX Is (one paragraph)

Contractors Exchange (CX) is a community marketplace for the construction industry - "LinkedIn meets a B2B marketplace" for contractors across all trades. Users (individuals and companies) can sell, auction (bid), or trade/exchange goods and services, organized by trade and location, inside a unified feed that mixes marketplace listings with industry discussion. The platform earns on the spread between the seller's net price and the buyer-facing price, with broader monetization planned once the user base scales.

---

## 1. The Core Bet

- **Marketplace is primary; community drives retention.** Both ship together because they reinforce each other: people come for industry conversation and discover relevant deals; sellers reach an engaged audience.
- **Revenue from day one (in design):** the spread between seller net and buyer price (see section 7B). Money is stubbed in v1; the pricing logic is fully built.
- **The central risk is leakage** (parties connecting then dealing off-platform). Design must fight it via escrow/buyer-protection, leakage-aware messaging, and keeping the seller's net price private.

## 2. Account & Identity Model (the spine - build this first)

Dual identity, LinkedIn-style:
- **Individual profile** - a person: name, trade(s), role/title, location, short bio/credentials. Can exist standalone (sole operator).
- **Company page** - a business: name, trades served, service area/locations, logo, description, storefront (its listings), team members. The commercial entity that sells and holds the payment account.
- **Association:** an individual can be linked to a company (owner/employee) and act on its behalf. A company can have multiple people. Permissions: company owner can manage page + listings.

> This dual model touches every other feature ("is the person or the company acting?"). It is the highest-complexity piece - get the data model right before building features on top.

## 3. The Marketplace (revenue engine)

- **Organized by trade + location** from day one. Every listing tagged with a trade category and geography; discovery defaults to relevant trade + near-me.
- **Four listing types (mutually exclusive per listing):**
  1. **Set price** - fixed, buy now. (Pricing runs through the spread/margin agreement in section 7B.)
  2. **Open for bid** - starting/reserve bid + close date.
  3. **Trade / exchange** - goods OR services; "connect & arrange directly," no escrow (see section 6).
  4. (Purchase is the escrow-protected completion of set-price and won-bid listings - the spread-earning flow.)
- **Listings owned by** a company page or an individual seller.
- **Listing fields:** title, trade category, location, photos, description, unit, freight/handling note, listing type + its fields, plus the pricing fields in section 7B.
- Listings appear **both** in structured browse/search **and** in the unified feed. Public surfaces show the buyer price only.

## 4. The Community Layer (light at launch)

- **Industry discussion posts** - text + optional image, tagged by trade and/or region.
- **Follows/connections** - users follow trades, locations, companies, and people; this shapes their feed.
- **Profiles + company pages** are the identity substrate.
- **NOT at launch:** algorithmic ranking, groups/events, endorsements/skills, articles/long-form.

## 5. The Unified Feed (the front door)

- One scrollable feed mixing listings + discussion posts, filtered by the trades and locations the user follows.
- **Simple and filterable** (reverse-chronological + filters by trade/location/type) - NOT a complex ranking algorithm in v1.
- Onboarding captures trade(s) + location so the feed is relevant on first visit.

## 6. Messaging (v1 - core, leakage-aware)

- **Simple 1:1 direct messaging** between users/companies. Entry points: "Message seller" on a listing, "Arrange exchange" on a trade, "Contact" on a profile/company page.
- **Leakage-aware by design:**
  - Surface the Buy / Bid / Complete-on-platform action (the checkout/order flow) as the path of least resistance.
  - Discourage immediate phone/email exchange; on-platform escrow/protection is the incentive to stay.
  - Completed deals feed the reputation system.
- **Async/simple** (text + optional image). NOT group chat, channels, real-time presence, typing/read-receipts at scale.

## 7. Trust & Payments

- **v1 (this build):** NO live payment processing. Purchases/bids create a transaction record and notify the seller; "escrow / buyer protection" is represented in the UI as the intended flow (stub/placeholder). This lets the founder validate the loop before building real payments.
- **Phase 2 (next):** real payments + escrow (card for small deals; invoice/PO/net-terms flow for large). The spread is captured on release of escrow.
- **Verification & reputation:** profile + company verification badges; ratings/reviews accrue from completed transactions; trade listings rely on reputation (no escrow).

> Rationale: capturing the spread ultimately requires owning payments, but building escrow before the loop is validated is premature. v1 designs the flow and stubs the money; Phase 2 makes it real.

## 7B. Revenue Model - Spread/Margin Pricing + Seller Agreement (BUILD LOGIC IN v1, MONEY MOVES IN PHASE 2)

CX earns primarily on the spread between the seller's net price and the buyer-facing price (like a digital reseller/marketplace operator). The buyer sees ONE clean price (seller net + CX margin); the seller's raw net is never publicly displayed. This is the automated, self-serve equivalent of a brokered-margin model - CX hides the seller's number, not the seller.

**Build the full pricing-agreement LOGIC and UI in v1 against stubbed payments. No real money moves until Phase 2 - but the entire seller pricing experience must be functional and testable now.**

### How pricing works
- Seller enters their desired **net** (what they want to receive).
- System computes the public **buyer price** = `seller_net + margin`, where margin comes from a per-category margin band (e.g. 12-25%) with a minimum viable margin floor.
- The public/displayed price everywhere (listing cards, storefront, feed, detail, search/sort) is the **buyer price**. The seller's net is private - shown only to the seller and in admin.

### Seller agreement flow (mostly automated; human fallback only on out-of-bounds counters)
1. Seller lists item + enters net -> system proposes the buyer price (shows seller BOTH their net and the proposed public price).
2. **Seller agrees** -> listing auto-publishes, fully self-serve. No human involved.
3. **Seller counters** (submits a reason + their own proposed buyer price):
   - If the counter still yields margin within the category band -> system auto-accepts and publishes.
   - If the counter falls below the minimum viable margin floor -> escalates to the Admin pricing queue (`pending_admin`) for manual approve / reject / counter.
4. Show the seller the lever, not just a number: display an estimated time-to-sell at the proposed price so the tradeoff (lower price = faster sale) is transparent.

### Aging / stale-inventory auto-reprice
- If an item is unsold after X days, the system auto-prompts the seller: "Hasn't sold in {X} days - lower your net to {Y} (new buyer price {Z}) to move it faster?" One-tap accept. Never touches the admin queue.

### Stored consent record (legal + dispute protection)
Every published listing stores: agreed `seller_net`, agreed `buyer_price`, `margin`, `agreement_status` (`auto_agreed` | `auto_accepted_counter` | `admin_approved` | `pending_admin`), `agreement_timestamp`, and `counter_reason`.

### Admin pricing-approval queue (part of the Admin panel)
A backend queue of pending out-of-bounds counters, each showing: seller net, system-proposed price, seller's counter price, seller's stated reason, resulting margin, and approve / reject / counter actions. Only below-floor counters appear here - most agreements resolve automatically.

### Honest limitation (design accordingly)
This solves seller consent to the markup (kills resentment-driven leakage) but not opportunistic leakage. It pairs with: keeping seller net private, leakage-aware messaging, and escrow/buyer-protection making on-platform completion genuinely better. The spread is durable only as long as the seller's net stays private AND on-platform completion is worth it.

### Roadmap: Option 1 now -> Option 2 later
- **v1 / Option 1:** seller-net-in -> system-price-out, single displayed price, per-category margin bands, agreement + aging logic. Payments stubbed.
- **Phase 2+ / Option 2:** algorithmic/dynamic buyer pricing, and optionally an automated reverse-auction/RFQ mode. Both grow directly from the v1 `seller_net + margin` schema - no rebuild.

## 7C. Admin Panel (backend - built alongside the front end, shares the same DB & models)

The admin panel is NOT a separate app - it is a protected `/admin` section inside the same Next.js application, gated to `AdminUser` accounts. It is a different view into the same database the front end uses, so it must be designed against the same data models from the start. Both interfaces read/write the same tables; admin actions flow back to what users see.

### v1 admin modules (BUILD NOW)
- **Pricing Approval Queue** - out-of-bounds seller counters (`agreement_status = pending_admin`): shows seller net, system-proposed price, seller counter, stated reason, resulting margin -> approve / reject / counter. Approving publishes the listing.
- **User & Company Management** - view/search all individual profiles + company pages; edit, suspend, and view Memberships.
- **Listing Management / Moderation** - view/search all listings across trades + types; flag, edit, remove; recategorize.
- **Verification** - review/approve verification requests; approving writes the verified badge flag back to the profile/company.
- **Category & Margin Configuration** - manage trade categories and their `CategoryMargin` bands (min / max / floor / default %). High-leverage: tunes the entire revenue model without code changes.

### Phase 2 admin modules (plan for, build later)
- **Transaction Oversight** - all transactions, statuses, spread captured (matters once real money moves).
- **Dispute Resolution** - view disputed transactions, parties, messages/evidence, resolve.

### Scale-stage admin modules (plan for, build when needed)
- Dashboard/Overview analytics, Content/Feed Moderation, Admin Users & Roles (tiered admin permissions).

### Admin build principles
- Gate all `/admin` routes to authenticated `AdminUser`s (role-checked server-side, not just hidden in UI).
- Admin reads/writes the SAME models as the front end - no duplicate data layer.
- Log admin actions (who approved/edited/removed what, when) to an `AdminAction` audit table.

## 8. UX North Star

- **Dead simple, "Facebook-Marketplace-easy."** List something in under 2 minutes.
- **Truly responsive** - equal quality on phone and desktop.
- **Onboarding:** capture trade(s) + location immediately so the feed/marketplace is relevant from second one.
- **Friction-killers:** passwordless or simple sign-in; auto/quick location; photo from camera or upload; everyone is both buyer and seller (no role switch); guest browsing allowed (account required only to list, message, or transact).
- **Progressive complexity:** keep the core dead-simple; reveal transaction/trust complexity only when completing a purchase.

## 9. Explicitly NOT in v1

- Live payment processing / real escrow (stubbed - Phase 2)
- Algorithmic feed ranking
- Group messaging / real-time chat infra
- Groups, events, endorsements, long-form articles
- Freight rate calculation (free-text note only)
- Government/sealed-bid procurement features
- Mobile native apps (responsive web only)
- Advanced analytics dashboards (basic counts only)

## 10. Tech Stack & Local Hosting

> The founder runs this locally on their own machine as the server. Target local-first development.

- **Framework:** Next.js (App Router) + TypeScript
- **Styling:** Tailwind CSS
- **Database:** local MySQL/MariaDB (via XAMPP) using the `@prisma/adapter-mariadb` driver. Swappable to Postgres later (change the datasource provider + adapter).
- **ORM:** Prisma (clean schema + migrations; DB-agnostic)
- **Auth:** local-friendly dev sign-in (signed httpOnly cookie) - works fully offline, no third-party SaaS for v1.
- **Image/media storage:** local filesystem in dev (`/public/uploads`) - abstracted so cloud storage can swap in later.
- **Run:** `npm run dev`, served at `localhost:3000`.
- **Version control:** Git from the start, pushed to the `contractors-exchange` GitHub repo; commit + push after each build step.

### Data Model (Prisma-style)

```
User            id, email, name, role/title, trades[], location {city,state,lat,lng},
                bio, avatar_url, verified, created_at
Company         id, name, slug, trades[], service_area, locations[], logo_url,
                description, verified, created_at
Membership      id, user_id, company_id, role ('owner'|'member')   -- links people to companies
Listing         id, owner_type ('company'|'user'), owner_id, title, trade_category,
                location {city,state,lat,lng}, photos[], description, unit, freight_note,
                type ('price'|'bid'|'trade'),
                seller_net,                  -- seller's desired net (PRIVATE, if type='price')
                margin,                      -- CX margin amount (derived from category band)
                buyer_price,                 -- PUBLIC displayed price = seller_net + margin
                agreement_status ('auto_agreed'|'auto_accepted_counter'|'admin_approved'|'pending_admin'),
                agreement_timestamp,
                counter_reason,              -- seller's stated reason if they countered
                start_reserve, closes_at,    -- if type='bid'
                trade_kind ('goods'|'service'),  -- if type='trade'
                listed_at, last_repriced_at, -- for aging/stale auto-reprice trigger
                status ('active'|'sold'|'awarded'|'closed'), created_at
CategoryMargin  id, trade_category, margin_min_pct, margin_max_pct, margin_floor_pct, default_pct
Post            id, author_type, author_id, body, image_url, trade_tag, region_tag, created_at
Follow          id, follower_user_id, target_type ('trade'|'location'|'company'|'user'), target_value
Transaction     id, listing_id, buyer_id, type ('purchase'|'bid'|'trade_request'),
                buyer_price, seller_net, margin,  -- spread captured here (stubbed money in v1)
                status, message, created_at
Message         id, thread_id, sender_id, recipient_id, body, image_url, listing_id?, created_at
Review          id, transaction_id, rater_id, ratee_id, stars, body, created_at
AdminUser       id, email, role ('superadmin'|'admin'|'moderator')  -- backend access; role-gated
AdminAction     id, admin_user_id, action_type, target_type, target_id, detail, created_at  -- audit trail
```

**Constraints:**
- Enforce listing-type field exclusivity (e.g. `type='price'` -> bid/trade fields null) at the schema/validation layer.
- For `type='price'`: `buyer_price` = `seller_net` + `margin`; only `buyer_price` is ever exposed in public/buyer-facing responses - `seller_net` and `margin` must be filtered out of any buyer-visible payload (seller sees own; admin sees all).

### Seed Data
Seed several trades WITH per-category margin bands (CategoryMargin), a handful of companies + individuals across two or three metro areas, and ~10-15 listings spanning all four listing types + a few discussion posts.

## 11. Build Order (for Claude Code)

1. Scaffold Next.js + TypeScript + Tailwind + Prisma; choose local DB; confirm `localhost:3000` runs.
2. **Identity & accounts** - User, Company, Membership; sign-in; profile + company page creation.
3. **Listings + pricing-agreement** - create-listing form (4 types, trade + location). For set-price listings: seller enters net, system proposes buyer price from the CategoryMargin band, seller agrees (auto-publish) or counters with a reason (auto-accept if within band, else `pending_admin`). Store the consent record. Only buyer_price is shown publicly. Listing detail + structured browse/search/filter by trade + location (sort/display by buyer_price only).
4. **Unified feed** - listings + posts intermixed, filtered by follows; onboarding captures trade + location.
5. **Messaging** - simple 1:1 threads, leakage-aware (in-thread/checkout buy/bid action), entry points from listings/profiles.
6. **Transactions (stubbed)** - purchase/bid/trade-request records storing buyer_price/seller_net/margin + seller notification; escrow/protection represented in UI, money not moved.
7. **Admin panel** - a protected `/admin` section inside the same app, gated server-side to `AdminUser`s, sharing the same DB/models. Build the v1 modules: Pricing Approval Queue, User & Company Management, Listing Management/Moderation, Verification, and Category & Margin Configuration. Log admin actions to `AdminAction`.
8. **Aging auto-reprice** - scheduled check: listings unsold after X days trigger a seller reprice prompt (one-tap accept lowers net -> recomputes buyer_price).
9. **Trust** - verification badges (manual flag), ratings/reviews from completed transactions.
10. **Seed + polish** - seed data (incl. CategoryMargin bands per trade), responsive pass, dead-simple UX, confirm full core loop + pricing-agreement end-to-end locally.

## 12. Success Criterion for v1

A locally-running CX where: a user can create an individual profile and a company page; publish a listing of any of the four types tagged by trade + location; for a set-price listing, enter a net price, see the system-proposed buyer price, and agree or counter (with auto-accept inside the margin band and admin escalation below the floor); browse/filter the marketplace seeing only buyer prices; see a unified feed of listings + posts relevant to followed trades/locations; message another user with the on-platform completion action present; create a (stubbed) transaction that records the spread and notifies the seller; and an admin can review/approve out-of-bounds pricing counters in a backend queue - all on the founder's machine, demoable, and ready to iterate module by module. (Real payments/escrow that "activate" the spread are Phase 2.)

---

## Implementation status (v1, as of this revision)

Steps 1-2 (scaffold, identity), 4 (feed), 5 (messaging), 6 (transactions stubbed), and 9 (trust/reviews) are built. Step 3's listing/browse is built on a simple public `price`; the **pricing-agreement system (7B)** is a retrofit still to do. The **admin panel (7C)** and **aging auto-reprice (8)** are not yet built. A nav/module redesign (app shell, checkout flow, messages/notifications/saved/profile workspaces) is in progress. Remaining build order: finish the redesign batches, then pricing-agreement -> transactions capture spread -> admin panel -> aging -> seed (with CategoryMargin) + polish. Build the front end and the `/admin` backend together against the same models.
