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
  Companies / Users; **Verify** and **Remove badge**. *(Open question: verification criteria — see §D.)*
- [ ] **Listings (moderation)** — search + status filter; close/reopen/mark-sold with
  reason; recategorize; superadmin remove. Moderators load **no** financial fields.
- [ ] **Users** — search; verify/unverify; suspend/unsuspend; superadmin delete (typed confirm).
- [ ] **Companies** — search; verify/unverify; suspend/unsuspend; superadmin delete.
- [ ] **Categories** *(new)* — tree of any depth; add/rename/move/reorder/archive/delete;
  leaf = assignable. *(Not yet wired to the public picker/filters — Chunk 2/3.)*
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

- [ ] **Category Chunk 2** — re-point the listing create/edit picker + validation + the
  Margins module to the DB leaf categories (so new categories are immediately listable/priceable).
- [ ] **Category Chunk 3** — re-point marketplace + feed filters, label lookups everywhere,
  and the onboarding/profile/company trade pickers to the DB tree.
- [ ] **Admin Module 1 — KPI Dashboard** — global filters + Revenue / Marketplace-health /
  **Leakage** / Network-trust KPIs.
- [ ] **Planning brief update** — refresh `docs/CX-Admin-Panel-Planning-Brief.md` to the
  corrected revenue model + category system.
- [ ] **Final end-to-end role-gating pass.**

## D. Open product decisions (need your call)

- [ ] **Verification criteria** — what *makes* a company/user verified? (Proposed default +
  options are in the chat.) This decides whether we add a verification **request** flow and a
  **checklist/notes** field on the verify action.
- [ ] Anything else you flag while testing.
