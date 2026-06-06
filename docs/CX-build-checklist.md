# Contractors Exchange — Build Checklist & Review Log

> Living checklist. **Workflow:** I build a module → it moves to "Needs your review" →
> **you test it on `admin.localhost:3000` (or `localhost:3000`)** → we check it off here.
> Nothing is "Done" until you've signed off. Update the `[ ]` to `[x]` when approved.

Last updated: this session.

---

## A. Admin modules — built, awaiting your review

Each lives on the admin subdomain (`admin.localhost:3000`). Sign in as:
`kerinhughes50@gmail.com` (superadmin), `jordan@riveraelectric.test` (admin),
`maria@lonestarplumbing.test` (moderator).

- [ ] **Roles, gating & subdomain** — admin link in avatar menu; `/admin` only on the
  subdomain; role-filtered nav; non-admins bounced. Test each role sees the right nav.
- [ ] **Dashboard** — time-windowed KPIs (7d/30d/90d/YTD/All): Revenue (admin+ only),
  Marketplace health, **Leakage signal**, Network/trust + deal funnel, a Needs-attention
  strip, and module shortcuts. Moderators see no financials.
- [ ] **Verification** — search; filter by Pending / Verified / New / All and by
  Companies / Users; **Verify** and **Remove badge**. **Request flow:** accounts
  submit legal name + contractor license + address + **uploaded documents** (on
  `/me` and the company workspace); the admin queue shows pending requests with
  the docs and **Approve / Deny (with note)**; the submitter is notified.
- [ ] **Listings (moderation)** — search + status filter; close/reopen/mark-sold with
  reason; recategorize; superadmin remove. Moderators load **no** financial fields.
- [ ] **Users** — search; verify/unverify; suspend/unsuspend; superadmin delete (typed confirm).
- [ ] **Companies** — search; verify/unverify; suspend/unsuspend; superadmin delete.
- [ ] **Categories** *(new)* — tree of any depth; add/rename/move/reorder/archive/delete;
  leaf = assignable. **Fully wired:** new categories flow into the listing picker, marketplace
  + feed filters, margins, labels, and profile/post pickers (the static taxonomy is retired).
- [ ] **Margins** — collapsible main categories; search; All/Configured/Default filter;
  edit % per trade; reset to default. Affects future listings only.
- [ ] **Audit log** — every admin action, filter by action/target.

## B. Revenue model & marketplace — built, awaiting your review

- [ ] **Flat margin model** — seller enters net; buyer price = net x (1 + category margin %);
  margin fixed. Pricing calculator on the create page (full breakdown + "what buyer sees").
- [ ] **Buyer offer / negotiation** — Make an offer; seller sees their net + concession note +
  midpoint counter; accept/decline/counter threaded in messaging; accept creates the order.
  Buttons: Accept green / Decline red / Counter orange. Buyer never sees net/margin.
- [ ] **Negotiation in Orders** — in-flight offers show as "Negotiating", link to the thread.
- [ ] **Stock decrement** — completing a set-price sale reduces quantity; sold at zero.
- [ ] **Marketplace Insights** — per-listing views/saves/inquiries/offers for the acting party (`/insights`).

## C. Remaining build work (not yet started / in progress)

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
  - [ ] Backfill remaining heavy modules to the service pattern, opportunistically: listing,
    message, then the feed pair post/engagement (coordinate - the other editor owns feed right now),
    then the lighter ones (follow, saved, profile, notification, review, verification).
  - [ ] When mobile starts: monorepo conversion, bearer-token auth path, then API endpoints for the
    flows mobile needs (browse, offers, messages, orders, notifications) + the Expo app.

## D. Open product decisions (need your call)

- [x] **Verification criteria** — DECIDED: verified = valid contractor license + confirmed
  business identity, via a request → review (with notes) → approve/deny flow + doc upload. Built.
- [ ] Anything else you flag while testing.
