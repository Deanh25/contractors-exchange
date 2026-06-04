# Contractors Exchange - Admin Panel Planning Brief

> **Purpose:** Hand this to Claude (or any collaborator) to plan the CX admin panel (PRD §7C).
> It captures the current app architecture, the live data models, every frontend module the admin
> must interoperate with, and how an admin backend communicates with the frontend. Use it to plan
> features, KPIs, security, and an admin-specific data model **before** building.
>
> **TL;DR for the planner:** The admin panel is **not a separate app or API**. It is more
> role-gated routes inside the *same* Next.js app, reading and writing the *same* Prisma models.
> Admin actions take effect on the public site because they mutate shared rows and revalidate the
> affected pages. Plan around that shared-database contract.

---

## 1. What CX is

A local-first **B2B construction marketplace + LinkedIn-style network**. Contractors and companies
buy, bid, and trade equipment/materials/services across trades and locations, message each other,
post to a feed, and build reputation through reviews. Revenue is a **spread/margin** CX adds on top
of a seller's private net price.

**Dual identity is the spine:** a `User` is a person; a `Company` is a business administered by
users. A user can act **as themselves or as a company** they're permitted to act for ("acting-as"
context). Listings, posts, messages, orders, reviews, and notifications can all belong to either a
**user party** or a **company party**.

---

## 2. Tech stack & architecture (how admin must integrate)

- **Next.js 16 (App Router)**, React Server Components + **Server Actions** (no separate REST/GraphQL API).
- **Prisma 7** ORM → **MySQL/MariaDB** (local via XAMPP; generated client at `src/generated/prisma`).
- **Auth:** custom signed httpOnly cookie (`cx_session` = `userId.HMAC-SHA256`), validated server-side.
- **Tailwind v4**; brand orange `#F7941E` (`brand` scale); navy `slate-900` rail.
- **Media:** local filesystem under `/public/uploads` (swappable for S3/R2 later).

**Integration contract for the admin panel:**
- Admin lives at `/admin/*` - **same app, same deploy, same DB**. No microservice.
- **Gate every admin route & action** with a server check (`requireAdmin()`), never client-side.
- Admin mutations are **Server Actions** that write the shared models, then `revalidatePath()` the
  public pages that depend on them. That's the entire "communication" mechanism - there is no
  message bus or API contract to design; it's shared rows + cache revalidation.
- **Privacy rule (critical):** `Listing.sellerNet` and `Listing.marginPct` are **private** (never
  shown to buyers anywhere). Admins *may* see them. Any admin view that surfaces them is privileged.

---

## 3. Current data model (Prisma) - the rows the admin will touch

### Identity
- **User**: `id, email, name, title, bio, trades(JSON), city/state/lat/lng, avatarUrl,`
  **`verified`** (Boolean - the Verified badge), **`isAdmin`** (Boolean - admin access), timestamps.
- **Company**: `id, name, slug, trades(JSON), serviceArea, city/state/lat/lng, logoUrl, description,`
  **`verified`**, timestamps.
- **Membership**: `userId, companyId, role(owner|member),` **`canActAsCompany`** (per-member "can act
  as the company" permission), createdAt.

### Marketplace (the heart of admin work)
- **Listing**:
  - Owner: exactly one of `ownerUserId` / `ownerCompanyId` (polymorphic).
  - `title, tradeCategory(slug), city/state/lat/lng, description, unit, freightNote,`
    **`condition`** (enum: new|like_new|good|fair|salvage), **`manufacturer`**, `photos(JSON urls)`.
  - `type` (enum: **price** | **bid** | **trade**), `tradeKind` (goods|service, for trades),
    `startReserve`+`closesAt` (bid), **`quantityAvailable`** (Int; 1 = unique, >1 = stockable).
  - **Spread pricing (§7B):** `price` = **PUBLIC buyer price**; `sellerNet` = **PRIVATE** net the
    seller keeps; `marginPct` = **PRIVATE** margin %; **`agreement`** (enum: **agreed** | **pending_admin**);
    `counterReason`; `listedAt`; `lastRepricedAt`.
  - `status` (enum: active | sold | awarded | closed), timestamps.
  - **Public visibility rule:** the marketplace/feed only show `status=active` AND
    (`agreement` is null OR `agreed`). **`agreement = pending_admin` listings are hidden from buyers**
    and only visible to their owner - *this is the queue the admin resolves.*
- **CategoryMargin**: `category(trade slug, unique), defaultPct, minPct, updatedAt`.
  - Drives buyer-price math at listing creation: `buyerPrice = sellerNet × (1 + marginPct/100)`.
  - A seller counter **≥ minPct** auto-agrees; **< minPct** → `pending_admin` (admin queue). **No max.**
  - **Contract:** editing a band affects **future** listings only; existing listings keep their
    stored `price`/`marginPct`. Code fallback `DEFAULT_BAND = { defaultPct: 12, minPct: 6 }`.

### Transactions / reviews / messaging / feed (party-aware)
- **Transaction** (an order/deal): polymorphic **buyer party** + **seller party**
  (`buyerType/buyerUserId/buyerCompanyId`, `sellerType/...`), `type(purchase|bid|trade_request)`,
  `amount`, **`buyerPrice`** (public), **`sellerNet`** (private), **`margin`** (private CX spread),
  `status(pending|accepted|declined|completed|cancelled)`. *Margin revenue is realized here.*
- **Review**: `transactionId`, polymorphic **rater** (`raterUserId` + optional `raterCompanyId`) and
  **ratee** (`rateeUserId` XOR `rateeCompanyId`), `stars(1-5)`, `body`. Personal vs company reviews
  are kept separate (a company deal reviews the company; ratings never cross over).
- **Thread / Message**: 1:1 threads between two **parties**; messages carry `senderUserId` +
  optional `senderCompanyId`.
- **Notification**: recipient is a party (`recipientUserId` XOR `recipientCompanyId`); company
  notifications are a single shared record seen by the permitted team.
- **Post / PostTag**: feed posts (authored as user or company) + tags mentioning users/companies.
- **SavedListing / Collection / Follow**: bookmarks and follows.

### Admin (already scaffolded)
- **AdminAction**: `adminId, action(string e.g. "pricing.approve"), targetType("listing"|"user"|"company"|"margin"), targetId?, detail?, createdAt`. The audit log.

---

## 4. Frontend modules the admin must stay in sync with

| Module | Frontend behavior | Admin touchpoints |
|---|---|---|
| **Marketplace** (`/listings`) | Navy filter rail (type, trade, location, distance, price, condition, manufacturer) + 3-up cards. Shows `price` only; cards show seller's **overall** star rating. Hides `pending_admin`. | Listing moderation (close/remove), pricing queue (un-hide approved), verified badge on seller |
| **Listing detail** (`/listings/[id]`) | Gallery w/ zoom; owner sees private net/margin breakdown; `pending_admin` 404s for non-owners | Approve/reject/counter pricing; moderate listing |
| **Listing create/edit** | Seller enters **net**; live buyer-price estimate from category band; below-min → red warning + confirm → `pending_admin` | Margin config changes the bands sellers see |
| **Orders** (`/orders`) | Party-scoped buyer/seller books; status flow; captures the spread on completion | (Phase 2) transaction oversight / disputes |
| **Reviews** | On user & company profiles; seller rating shown on marketplace cards | (Phase 2) review moderation |
| **Identity / acting-as** | Top-bar switcher; per-member `canActAsCompany`; company workspace | User/company management; verification |
| **Feed / Messages / Notifications / Saved** | Party-aware social + comms | (Scale) content moderation |

**Key propagation examples (the "communication"):**
- Admin **approves** a `pending_admin` listing → set `agreement=agreed`, `listedAt=now` →
  `revalidatePath('/listings')` → it appears in the marketplace.
- Admin **verifies** a user/company → `verified=true` → the badge renders everywhere it's shown.
- Admin **edits a margin band** → only **new** listings price against it (document this clearly).
- Admin **closes** a listing → `status=closed` → drops out of all public lists.

---

## 5. Admin panel scope (PRD §7C) - to refine in planning

**v1 modules (build first):**
1. **Pricing Approval Queue** - list `agreement = pending_admin` listings with full context
   (seller net, requested buyer price, implied margin %, category min, `counterReason`). Actions:
   **Approve** (→ agreed, go live), **Reject** (keep held / close with reason), **Counter** (admin sets
   the buyer price/margin). Every action → `AdminAction` + notify the seller.
2. **User & Company Management** - search/list, view detail, toggle **verified**, (soft) suspend.
3. **Listing Moderation** - search/list all listings (incl. hidden), close/reopen/remove with reason.
4. **Verification** - the trust workflow that writes the `verified` badge (users + companies).
5. **Category & Margin Config** - CRUD `CategoryMargin` (defaultPct, minPct) per trade, no code deploy.
6. **Audit Log** - read-only view of `AdminAction` (filter by admin, action, target, date).

**Phase 2:** Transaction Oversight, Disputes/refunds, Review moderation.
**Scale-stage:** Dashboard/analytics home, Content moderation (feed), **Admin roles** (superadmin /
admin / moderator) replacing the single `isAdmin` flag.

### 5a. Seller-facing analytics: "Marketplace Insight" (separate module, shared data)

A **seller-facing** KPI module (NOT admin) so a seller - **personal or company** - can see how their
own listings are performing. Lives in the seller's workspace (e.g. `/me` and the company workspace),
**not** under `/admin`. It reads the same marketplace data plus a new lightweight event/counter.

- **Per-listing KPIs:** **Views** (detail-page views), **Saves** (count of `SavedListing`),
  **Inquiries/messages** (threads with this `listingId`), **Offers/bids received**
  (`Transaction`s for the listing), **conversion** (views → inquiry → sale), **age/days listed**,
  marketplace **impressions** (appearances in list results - Phase 2, harder), and for set-price
  items **stock remaining** (`quantityAvailable`).
- **Seller rollup:** totals across all their listings (active count, total views/saves this week,
  best-performing listing, stale/no-activity listings to nudge), shown both for the **personal**
  party and **per company** party.
- **New data needed:** there is **no view tracking today.** Add either a `Listing.viewCount` counter
  or (preferred) a `ListingView` event row (`listingId, viewerParty?, source, createdAt`) so we can do
  trends/uniques and feed both seller insight AND the admin dashboard from one source. Saves/inquiries/
  offers are already derivable from `SavedListing` / `Thread.listingId` / `Transaction`.
- **Privacy:** a seller sees insight for **their own** listings only (gate by listing ownership /
  acting-as party). Never expose another seller's data. Admin's global dashboard can aggregate the
  same event data across everyone.
- **Why it's in this brief:** the view-tracking model is a shared dependency - the admin KPI dashboard
  (§6) and Marketplace Insight should read the **same** event source, so plan the model once.

---

## 6. Suggested KPIs / dashboard metrics (to prioritize in planning)

**Revenue (the spread is the business):**
- Realized **CX margin** = Σ `Transaction.margin` where `status=completed` (by day/week/month).
- **GMV** = Σ `Transaction.buyerPrice` completed; take-rate = margin ÷ GMV.
- **Potential margin in-flight** = Σ margin of active set-price listings.
- Avg margin % by category; revenue by trade/region.

**Marketplace health:**
- Active listings (by type/trade/condition), new listings/day, median time-to-sell.
- **Pricing queue:** # `pending_admin`, avg age in queue, approve/reject rate.
- Listings with photos %, with reviews %, stock value (Σ price×quantityAvailable).

**Network / trust:**
- Users & companies total + new/week; **verified %**; acting-as adoption.
- Deal funnel: listings → requests → accepted → completed (conversion + completion rate).
- Review coverage (% completed deals reviewed), avg rating, low-rated sellers flag.

**Comms/engagement (lighter):** messages/day, notification read-rate, feed posts/day.

---

## 7. Security & governance (decide before building)

- **Server-side gating only.** `requireAdmin()` on every admin route *and* every admin server action.
  Non-admins get redirected to `/` with **no hint** that `/admin` exists. Never gate on the client.
- **Audit everything.** Already have `AdminAction`; log who/what/target/when (+ before→after detail)
  for every mutating action. Consider logging *views* of sensitive data (sellerNet) too.
- **Least privilege / admin roles.** v1 is a single `isAdmin` flag; plan the move to roles
  (superadmin can manage admins + margins; moderator can only moderate listings/verify). Decide the
  matrix now even if you ship the flag first.
- **Sensitive data.** `sellerNet`/`marginPct` are private seller business data - admin access is a
  privilege; keep it on a need-to-know surface and audited. Never expose via any buyer-facing path.
- **Destructive actions.** Prefer **soft** state changes (`status=closed`, `verified=false`) over hard
  deletes; require a typed confirm + reason; keep the audit trail. Reserve hard delete for spam.
- **Auth hardening (roadmap).** Current cookie auth is dev-grade. For admins consider: short session
  TTL, re-auth for sensitive actions, optional 2FA, IP allowlist, and rotating `AUTH_SECRET`.
- **Abuse/limits.** Server Actions carry framework CSRF protections; still add rate limiting on
  bulk/destructive admin endpoints. Validate + clamp all inputs server-side (don't trust the form).
- **PII / compliance.** Note where emails/locations live; plan export/delete (GDPR/CCPA) handling.

---

## 8. Already scaffolded in the codebase (starting point)

- `User.isAdmin` (Boolean) + `AdminAction` model + migration **applied**.
- `src/lib/admin.ts`: `getAdmin()`, `requireAdmin()`, `logAdminAction(adminId, action, targetType, targetId?, detail?)`.
- The **`pending_admin` pipeline already exists**: below-minimum seller pricing creates held listings,
  hidden from buyers, waiting for exactly this queue.
- `CategoryMargin` model + `lib/pricing.ts` (`getMarginBand`, `computePricing`, `buyerPriceFor`,
  `impliedMarginPct`) - the margin-config module edits these.
- Seed (`prisma/seed.ts`) - add an admin user + a couple of `pending_admin` listings to exercise the queue.

---

## 9. Open decisions for planning (answer these)

1. **Admin roles:** ship single `isAdmin` now, or model `superadmin/admin/moderator` from day one?
2. **Rejected pricing:** does Reject **close** the listing, bounce it back to the seller to re-price,
   or hold indefinitely? What does the seller see/get notified?
3. **Admin counter:** when an admin sets the buyer price, is the seller's net preserved (margin
   recomputed) and do they have to re-accept, or is admin's word final?
4. **Stock on sale:** should a completed set-price purchase **decrement `quantityAvailable`**?
   (Currently it does not - the stepper just caps at available.)
5. **Soft vs hard delete** thresholds; what's recoverable.
6. **Dashboard scope** for v1 - full KPI home, or defer analytics to Phase 2 and ship the queues first?
7. **Margin change semantics** - confirm "future listings only," and whether to offer a bulk
   "reprice existing" tool.

---

## 10. Suggested build order

1. Admin shell + `requireAdmin` gate + left nav + seed an admin (foundation - *scaffolded*).
2. **Pricing Approval Queue** (highest leverage; the `pending_admin` pipeline is already feeding it).
3. **Verification** + **User/Company management** (small, high-trust).
4. **Listing moderation**.
5. **Category & margin config**.
6. **Audit log** view.
7. (Later) Dashboard/KPIs, then Phase-2 oversight/disputes, then admin roles.

---

*Generated from the current CX codebase. The single most important thing for the planner to internalize:
the admin panel shares the live database and mutates the same rows the public site reads - so every
admin feature is really "which model field do we change, who's allowed, what do we log, and which
public pages revalidate."*
