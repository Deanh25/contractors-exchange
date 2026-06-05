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
- [ ] **Dashboard (home launchpad)** — role-aware module cards. *(Full KPI dashboard still to build — Module 1.)*
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
- [ ] **Admin Module 1 — KPI Dashboard** — global filters + Revenue / Marketplace-health /
  **Leakage** / Network-trust KPIs.
- [ ] **Planning brief update** — refresh `docs/CX-Admin-Panel-Planning-Brief.md` to the
  corrected revenue model + category system.
- [ ] **Final end-to-end role-gating pass.**

## D. Open product decisions (need your call)

- [x] **Verification criteria** — DECIDED: verified = valid contractor license + confirmed
  business identity, via a request → review (with notes) → approve/deny flow + doc upload. Built.
- [ ] Anything else you flag while testing.
