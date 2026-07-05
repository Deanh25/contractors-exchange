# Contractors Exchange — Build Checklist & Review Log

> Living checklist. **Standard workflow (required for every feature):**
> 1. Build the feature.
> 2. Provide **step-by-step test instructions** (exact path/account, numbered steps, expected
>    result at each step, role differences, edge cases).
> 3. You test it on the running site.
> 4. You **sign off**.
> 5. **Only then commit** and check it off here (update `[ ]` to `[x]`).
>
> Nothing is "Done" - and nothing is committed - until you've tested and signed off.

Last updated: this session.

---

## A. Admin modules — built, awaiting your review

Each lives on the admin subdomain (`admin.localhost:3000`). Sign in as:
`kerinhughes50@gmail.com` (superadmin), `jordan@riveraelectric.test` (admin),
`maria@lonestarplumbing.test` (moderator).

- [x] **Roles, gating & subdomain** — admin link in avatar menu; `/admin` only on the
  subdomain; role-filtered nav; non-admins bounced. Test each role sees the right nav.
- [x] **Dashboard** — time-windowed KPIs (7d/30d/90d/YTD/All): Revenue (admin+ only),
  Marketplace health, **Leakage signal**, Network/trust + deal funnel, a Needs-attention
  strip, and module shortcuts. Moderators see no financials.
- [x] **Verification** — search; filter by Pending / Verified / New / All and by
  Companies / Users; **Verify** and **Remove badge**. **Request flow:** accounts
  submit legal name + contractor license + address + **uploaded documents** (on
  `/me` and the company workspace); the admin queue shows pending requests with
  the docs and **Approve / Deny (with note)**; the submitter is notified.
- [x] **Listings (moderation)** — search + status filter; close/reopen/mark-sold with
  reason; recategorize; superadmin remove. Moderators load **no** financial fields.
- [x] **Users** — search; verify/unverify; suspend/unsuspend; superadmin delete (typed confirm).
- [x] **Companies** — search; verify/unverify; suspend/unsuspend; superadmin delete.
- [x] **Categories** *(new)* — tree of any depth; add/rename/move/reorder/archive/delete;
  leaf = assignable. **Fully wired:** new categories flow into the listing picker, marketplace
  + feed filters, margins, labels, and profile/post pickers (the static taxonomy is retired).
- [x] **Margins** — collapsible main categories; search; All/Configured/Default filter;
  edit % per trade; reset to default. Affects future listings only.
- [x] **Audit log** — every admin action, filter by action/target.

## B. Revenue model & marketplace — built, awaiting your review

- [x] **Flat margin model** — seller enters net; buyer price = net x (1 + category margin %);
  margin fixed. Pricing calculator on the create page (full breakdown + "what buyer sees").
- [x] **Buyer offer / negotiation** — Make an offer; seller sees their net + concession note +
  midpoint counter; accept/decline/counter threaded in messaging; accept creates the order.
  Buttons: Accept green / Decline red / Counter orange. Buyer never sees net/margin.
- [x] **Negotiation in Orders** — in-flight offers show as "Negotiating", link to the thread.
- [x] **Stock decrement** — completing a set-price sale reduces quantity; sold at zero.
- [x] **Marketplace Insights** — per-listing views/saves/inquiries/offers for the acting party (`/insights`).

## C. Remaining build work (not yet started / in progress)

- [ ] **Profile system (LinkedIn-style, users + companies)** *(new — QUEUED, not started; do
  not begin until the Codespaces sign-in issue is resolved)* — shared profile layout with two
  variants (`/u/[id]` users, `/company/[slug]` companies; reuse existing routes, do not create
  `/c/[slug]`). Survey-first (Step 0): reuse the existing `ProfileHeader`, `Avatar`, `FollowButton`,
  Contact/message actions, `ListingCard`, `PostCard`, `ReviewList`/`StarRating`, `MediaGallery`
  (lightbox), and `src/lib/storage.ts` uploads. CX is FOLLOW-only (no Connect); do NOT rebuild the
  working Follow / Message / List buttons. Build in 4 reviewed parts:
  - Part 1 **(BUILT + tested + signed off)** — profile data + inline image uploads: add `User.bannerUrl` + `Company.bannerUrl`
    (avatar/logo already exist); inline upload/replace for photo/logo AND banner via existing
    storage helper; add any missing fields (User: headline/credentials; Company: tagline, website,
    foundedYear, size, specialties, serviceArea, locations). Sensible defaults, never a broken image.
  - Part 2 — shared header: banner + overlapping photo (circle users / rounded-square companies),
    identity block, verified badge, follower counts, action buttons wired in, owner sees "Edit
    profile"; horizontal tab bar: Home · About · Posts · Photos · Listings · Reviews.
  - Part 3 — the six tabs (Home overview, About, Posts feed by author, Photos = work/job portfolio
    gallery w/ lightbox, Listings storefront showing buyer_price only, Reviews avg+count with clean
    empty state). Listings tab must never expose sellerNet/margin.
  - Part 4 — ownership/editing: owner (or member with `canActAsCompany`) edits inline; everyone
    else read-only; gate edits server-side; respect acting-as context. Update seed so tabs render
    with real content plus one fresh empty-state profile. Commit/push per part.
  - Architecture rule: domain logic in `src/lib/services/profile.ts` (extend), Server Action stays a
    thin shim (parse FormData, save media to URL, call service, revalidate). Pause for review after
    each part. (Full prompt: `docs/CX-profile-system-prompt.md` if saved.)
- [x] **Admin user management (create users + assign roles)** *(BUILT + tested + signed off)* - fill the gap
  where admin roles can currently ONLY be set by editing `prisma/seed.ts`. Build in the existing
  Users admin page (`/admin/users`):
  - **Create teammate**: a "New user" form (name + email, optional admin role at creation). Creates
    the account row so they can sign in via the existing passwordless email flow. Reject duplicate
    emails with a clear message.
  - **Assign / change role on existing users**: a per-user role control (none / moderator / admin /
    superadmin) on each row in the list, so seeded or self-signed-up users can be promoted/demoted.
  - **Gating**: superadmin only. Wire the already-defined-but-unused `manageAdmins` capability
    (`requireCapability("manageAdmins")`) in the page AND the Server Action (defense in depth).
  - **Guardrails**: a superadmin cannot remove their own superadmin role (avoid lockout); never let
    the last superadmin be demoted; the role control is hidden/disabled for non-superadmins.
  - **Audit**: every user creation and role change writes to the audit log via `logAdminAction`.
  - **Architecture**: domain logic in `src/lib/services/admin-users.ts` (new service, per AGENTS.md);
    `src/app/actions/admin-users.ts` stays a thin shim (resolve actor, parse FormData, call service,
    revalidate). No `FormData`/`redirect`/`cookies()` in the service.
- [ ] **Reports module (`/admin/reports`)** *(new - not started)* - exportable, filterable,
  historical reports that complement the at-a-glance Dashboard. Each report shares: the Dashboard
  time windows (7d/30d/90d/YTD/All) plus a custom date range; filters for category/trade, region
  (state), status, and party; and export to BOTH CSV (raw data for spreadsheets) and PDF (a clean,
  branded, printable document with the report title, date range, applied filters, and a summary).
  Every report supports both formats. Financial columns are stripped server-side for
  moderators (reuse the `financials` capability), so non-financial reports stay available to them.
  Recommended report set (all backed by data we already store):
  - **Tier 1 (financial/operational, build first):**
    - Revenue & Margin - completed transactions over the range: GMV, realized CX margin, take rate,
      by month and by category/trade.
    - Sales / Orders detail - line-item transaction table (date, listing, buyer, seller, buyer
      price, margin, status); the export backbone for accounting.
    - Listings & Inventory - listings by status/category/region, current stock value, new listings
      over time, plus a Leakage detail drill-down (at-risk + sold-elsewhere listings).
    - Marketplace funnel / conversion - Listings -> Inquiries -> Deals -> Completed with conversion
      rates per period.
  - **Tier 2 (growth, trust, governance):**
    - User & Company growth - new signups over time by region/trade; verified vs unverified; active
      vs suspended.
    - Verification throughput - submitted/approved/denied over time, approval rate, time-to-decision,
      current backlog.
    - Reviews & trust - review coverage, average rating, rating distribution.
    - Admin activity - AdminAction log aggregated by admin + action type (accountability).
  - **Tier 3 (strategic, optional):**
    - Category performance - per category: listings, GMV, margin, avg days-to-sale, leakage rate
      (informs margin tuning).
  - **Exports**: CSV and PDF for every report. The service returns typed rows + summary; the CSV and
    PDF generators are transport-layer concerns (a util/route, not the service). PDF approach to
    settle when we build: server-side render to PDF (e.g. a print-stylesheet route + headless render,
    or a PDF lib) so the document matches the on-screen report. Decide the library then.
  - **Gating**: add a `reports` capability (min role admin for financial reports; moderators get the
    non-financial subset). Wire it in the page AND both export actions (CSV + PDF).
  - **Architecture**: query/aggregation logic in `src/lib/services/admin-reports.ts` (framework-
    agnostic, returns typed rows the future mobile/API can reuse); the page + CSV/PDF export actions
    stay thin shims. No `FormData`/`redirect`/`cookies()` in the service.
- [ ] **Dashboard KPIs clickable -> drill into modules** *(new - not started)* - make each KPI tile
  (and the deal-funnel steps and the needs-attention strip) a link that navigates to the related
  module, deep-linked to a pre-filtered view where possible. Mapping:
  - Users / Verified users -> `/admin/users` (verified filter for the verified tile)
  - Companies / Verified companies -> `/admin/companies` (verified filter)
  - Active listings / Stock value / In-flight margin -> `/admin/listings?status=active`
  - At-risk listings -> `/admin/listings` filtered to at-risk; Closed: sold elsewhere ->
    `/admin/listings?status=closed` (sold_elsewhere reason)
  - "N verification requests" + Verification-related tiles -> `/admin/verification`
  - Revenue tiles (Realized margin, GMV, Take rate), funnel steps (Deals started, Completion rate,
    Inquiries/Deals/Completed), and Review coverage -> the **Reports module** (depends on Reports
    being built; until then, leave these non-clickable or point at the nearest existing view).
  - Build in two phases: Phase 1 wire the tiles with existing destinations now; Phase 2 point the
    revenue/funnel/review tiles at the relevant report once the Reports module ships.
  - Some destinations need a small filter param added to the target page (e.g. Listings "at-risk",
    Users/Companies "verified-only"); include those filter additions in this task. Keep tiles
    keyboard-accessible (real links/buttons), and respect role gating (a moderator's tiles must not
    link to pages they cannot access).
- [ ] **Option B - separate staff (admin) accounts from customer accounts** *(DECIDED, not started)* -
  split admin identity from customer identity so frontend and backend are genuinely separate access.
  Build in ~4 reviewed parts (pause for test + sign-off after each):
  - Part 1 - account type + data model: add an account type (e.g. `User.accountType` = customer |
    staff) so an account is either a marketplace customer OR backend staff. Enforce in services
    (customers always `adminRole` none; staff always hold an admin role, have no public marketplace
    presence, cannot list/buy). Migration for existing seeded admins + the founder split.
  - Part 2 - backend Team / Admins module (`/admin/team`): lists staff only; relocate the just-built
    "create user + assign role" feature here (it creates staff accounts); superadmin-gated.
  - Part 3 - customers-only Users module: filter `/admin/users` to customers; ensure staff never
    appear in marketplace/search/directory and cannot reach customer flows.
  - Part 4 - access separation + hardening: a customer login can never reach /admin and a staff login
    can never shop; production subdomain/cookie isolation; optional hardened admin auth (password or
    SSO + 2FA). Update seed to demo the split (founder = a contractor identity + a separate staff
    superadmin). Architecture: domain logic in services (extend admin-users + identity), thin shims.
- [ ] **Admin notifications** *(new — not started)* — a notification center inside `/admin`
  for admin-relevant events (new verification requests, pricing/leakage flags, disputes,
  new/high-value orders, flagged listings, etc.), with optional delivery to admins by
  **email** and **SMS/text**. Needs: an email provider (e.g. Resend / SendGrid / SES) and an
  SMS provider (e.g. Twilio) with API keys/secrets; per-admin **event + channel preferences**;
  store an admin phone/email. Decisions to settle when we start: which provider(s), which events
  trigger which channel, and whether to extend the same email/SMS delivery to the existing
  user-facing notifications.
- [x] **Category system (Chunks 2 + 3)** — the DB tree drives the listing picker, validation,
  margins, marketplace + feed filters, labels everywhere, and profile/company/onboarding/post
  pickers. Static taxonomy retired. *(Built; ready for your review.)*
- [x] **Admin Module 1 — KPI Dashboard** — time filter + Revenue / Marketplace-health /
  **Leakage** / Network-trust KPIs + deal funnel + needs-attention. *(Built; ready for review.)*
  Follow-up (optional): add the geography/trade/type/party global filters beyond the time window.
- [ ] **Planning brief update** — refresh `docs/CX-Admin-Panel-Planning-Brief.md` to the
  corrected revenue model + category system.
- [ ] **Final end-to-end role-gating pass.**

## E. Platform direction — mobile + architecture (DECIDED this session)

> Context: contractors will use mobile more than web. We are NOT building the mobile app
> yet, but every feature from now on is built so the mobile app is a "screens + endpoints"
> job later, not a backend rewrite. See the reasoning in the conversation log / memory.

- **Mobile tech = React Native (Expo).** Not full native (too costly for our team, 2 codebases),
  not PWA-as-destination (weak iOS push, no store presence). Expo shares TypeScript + types with
  web and gives ~90% of LinkedIn-class native feel. Full native stays a "someday at scale" luxury.
- **Repo = monorepo, converted LATER (not now).** Target layout `apps/web` + `apps/mobile` +
  `packages/core` (shared services, types, validation). Stay single-app today; convert when we
  start the mobile app. The conversion is mechanical once the service layer exists.
- **UI is NOT shared** — web React/Tailwind and mobile native screens are separate by design.
  Only the **logic layer** (services, domain types, validation, the future API) is shared.
- **House rule going forward (the one discipline):** business logic lives in a **service layer**
  (`src/lib/services/<domain>.ts`), framework-agnostic and callable. Server Actions become **thin
  shims**: parse FormData -> resolve identity/acting-as from cookies -> call the service -> map the
  result to `redirect`/`revalidatePath`. A mobile endpoint will later call the SAME service with
  JSON + a bearer token. No `FormData`, `redirect`, `revalidatePath`, or `cookies()` inside a service.
- **Auth:** add a bearer-token resolver alongside the cookie when mobile starts; `getSessionUserId`
  is the single chokepoint, so this is contained. Cookie stays for web.
- **Build tasks queued:**
  - [x] **Service-layer PoC — offers module** — extract `makeOffer` / `respondToOffer` into
    `src/lib/services/offers.ts`; action becomes a thin shim, no behavior change. *(Reference pattern.)*
  - [x] **Shared infra** — `src/lib/services/actor.ts` (the `Actor` type) + `resolveActor()` in
    `src/lib/identity.ts` (cookie session -> Actor). All services + shims use these.
  - [x] **Transactions/deals** — `createDeal` / `updateDeal` in `src/lib/services/transactions.ts`
    (spread + stock decrement); `actions/transaction.ts` is now a thin shim. No behavior change.
  - [x] **Messaging** — `startPartyThread` / `startListingThread` / `sendMessage` / `markThreadRead`
    in `src/lib/services/messages.ts`; shim saves uploads to a URL then calls the service.
  - [x] **Light modules** — `follows`, `saved`, `profile`, `notifications`, `reviews`, `verification`
    each extracted to `src/lib/services/*` with thin shims. No behavior change.
  - [x] **Listing** — `createListing` / `updateListing` / `updateListingStatus` / `deleteListing` in
    `src/lib/services/listings.ts` (pricing assembly + persistence); shim keeps parsing/validation/
    authorization/media. No behavior change.
  - [x] **Feed pair (`post` / `engagement`)** — `src/lib/services/posts.ts` (createPost + mentions) and
    `src/lib/services/engagement.ts` (post/comment reactions + comments). Done after the other editor
    landed their feed-comments work.
  - [x] **BACKFILL COMPLETE** — every mutation module now follows the thin-shim-over-service pattern.
    Server Actions hold only transport (FormData/redirect/revalidate/cookies/media); domain logic is
    framework-agnostic in `src/lib/services/*` and ready for a mobile API to call. Remaining for the
    mobile phase only: monorepo conversion, bearer-token auth path, and the actual endpoints + Expo app.
  - [ ] When mobile starts: monorepo conversion, bearer-token auth path, then API endpoints for the
    flows mobile needs (browse, offers, messages, orders, notifications) + the Expo app.

## D. Open product decisions (need your call)

- [x] **Verification criteria** — DECIDED: verified = valid contractor license + confirmed
  business identity, via a request → review (with notes) → approve/deny flow + doc upload. Built.
- [x] **Separate admin identity from customer identity (pre-go-live)** *(DECIDED: Option B - separate
  staff accounts; build task queued in section C)* - today
  one `User` account carries both marketplace use and admin access (`adminRole`), so a single login
  reaches both the public site and `/admin`. (Note: the "shared" feel in Codespaces is partly a dev
  artifact - the session cookie is host-only, so the production admin subdomain already gets its own
  cookie + separate sign-in. But it is still the SAME account/identity.) Goal: frontend and backend
  are genuinely separate access. Options:
  - **A - session/host separation only** (mostly already built): admin subdomain + own cookie +
    hardened auth; still the same accounts.
  - **B - separate "staff" accounts (recommended)**: a staff/admin account TYPE with backend access
    but no marketplace presence (no public profile, cannot list/buy). Then the frontend **Users**
    module lists only customers, and a new backend **Team / Admins** module lists staff (this is
    where the just-built "create user + assign role" feature would move). Customer logins never reach
    admin; staff logins never shop.
  - **C - fully separate `AdminUser` table + separate auth** (heaviest, max isolation; touches the
    audit log + `Actor` model).
  - Recommended: **B + the subdomain/cookie isolation and admin auth hardening from A.** Implication
    to settle: the founder account (Dean Hughes) is currently both a contractor profile AND
    superadmin; under B it splits into a customer identity + a separate staff superadmin account.
    Pair with hardened admin auth (password or SSO + 2FA) for go-live. The just-built Admin user
    management feature still applies; under B it relocates to the new Team module.
- [ ] Anything else you flag while testing.
