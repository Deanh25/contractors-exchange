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

- **Listing + media changes (07/19/2026 requests)** - work in the order below; each is
  built, tested, then committed on its own.
  - [x] **1. Open-for-bid earnings breakdown** - bring the set-price net / CX margin /
    buyer-pays panel to Open-for-bid listings so the seller sees the potential take.
    DECIDED: the reserve IS the seller's NET floor (mirrors set price), so the public
    opening bid = reserve x (1 + category margin); the service stores that in `price`
    and buyers see it. Includes the optional "estimate your take at a winning bid"
    what-if strip. Mockup: `docs/mockups/openforbid-pricing.html`. *(Built; awaiting test.)*
  - [x] **2. Listing photos - drag-and-drop main photo + preview** *(built + tested + signed off)* - let the seller
    reorder photos in the listing form (first = main/cover) by drag-and-drop, and
    preview them. Reuse the drag pattern from `src/app/admin/categories` and the
    lightbox from `ProfilePhotos`/`MediaGallery`. Component: `MediaUpload.tsx`.
  - [x] **3. Feed - multiple photos/videos + drag-drop main + preview (LinkedIn parity)**
    *(BUILT + tested + signed off, commit ecfe45c)* - composer + edit reuse the listing
    `MediaUpload` picker (multi photo/video, drag to set main, click to preview); posts
    got a `media` JSON array (`imageUrl` kept as the cover mirror so legacy posts render);
    `PostCard` renders `PostMediaCarousel` (N/total counter, prev/next, dots, lightbox)
    for >1 item. Shared `src/lib/media-order.ts` builds the drag-order for posts + listings.

- [x] **Order milestone timeline (buying + selling)** *(BUILT + tested + signed off 07/21/2026,
  commit b2bad64)* - the vertical "Timeline" list on `/orders/[id]` became a HORIZONTAL milestone rail
  showing the WHOLE process, past and future: done steps solid green with a check, the current
  step ringed in brand orange, future steps outlined, and a red terminal marker when a deal is
  declined/cancelled (the steps that never happened grey out).
  - Steps come from `orderTimeline()` in `src/lib/order-timeline.ts` - pure and framework-
    agnostic (no Prisma, React, or next/*), so the Expo app renders the same rail. Rendering
    lives in `src/components/OrderTimeline.tsx`.
  - Three courses by deal type: purchase and bid run Requested/Bid placed -> Accepted/Awarded ->
    Payment -> Handoff -> Completed -> Review; a trade has no escrow, so no Payment step and the
    third step is "Exchange - arrange directly".
  - Payment and Handoff are shown but labeled "Escrow, stubbed in v1" until the payments module
    lands; those step keys are the natural hooks for the Stripe/escrow work.
  - Hints are role-aware: the buyer reads "Waiting on the seller", the seller reads "Your move:
    accept or decline".
  - SCHEMA: added `Transaction.acceptedAt / completedAt / closedAt` (nullable) and stamped them in
    `src/lib/services/transactions.ts`. Without them every step read `updatedAt`, so an accepted
    and completed order both showed "just now". Legacy rows fall back to `updatedAt`. Applied with
    `db:push`; additive and non-destructive, no reseed needed.
  - FOLLOW-UP (not built): a mini version of the rail on the Orders list rows and in the message
    thread's deal panel (the messenger mock shows the latter).
  - SAMPLE DATA: `scripts/seed-timeline-samples.ts` creates one order per timeline scenario
    (every status, all three tracks, and both viewer roles) with staggered milestone stamps,
    titled `[TL] 1..9`. Non-destructive and re-runnable; it only removes its own `[TL]` rows.
  - The mini rail in the message thread SHIPPED with messenger Round 1 (commit 27c486f).

- [ ] **Messenger upgrade (Facebook Messenger + LinkedIn feel)** *(new 07/21/2026 - MOCK APPROVED
  by Dean 07/21; scope = rounds 1-3, inbox power features NOT queued. ROUND 1 BUILT + signed off,
  commit 27c486f; NEXT UP: Round 2)* - mock: `docs/mockups/messenger.html` (also published as an
  artifact). The structural change is a persistent SPLIT VIEW (thread list left, live conversation
  right) instead of today's separate `/messages` and `/messages/[id]` pages; phones keep the
  current inbox-then-conversation flow.
  - **DECIDED (Dean, 07/21/2026), all three mock questions answered:**
    1. **Split view on desktop, phone flow unchanged - YES.** Build it.
    2. **Keep the deal panel pinned at the top of the conversation WITH its milestone rail - YES.**
       So the mini rail from the mock is part of this work; it reuses `orderTimeline()` from the
       order-timeline task above, in a compact renderer.
    3. **Rounds 2 and 3 stay exactly as scoped** - nothing pulled forward, nothing dropped.
  - [x] **Round 1 (BUILT + tested + signed off 07/21, commit 27c486f)** - split view; consecutive messages grouped under one avatar with
    a single timestamp; day dividers; deal events rendered as centered event chips; "Seen" receipts
    built from the existing `Thread.aLastReadAt/bLastReadAt`; Enter sends / Shift+Enter newline;
    auto-scroll; sticky composer.
  - **BUG this fixes:** `txCreatedMessage` / `txStatusMessage` (`src/lib/transactions.ts`) write
    deal events as ordinary `Message` rows authored by whoever clicked, so "Dean Hughes accepted
    the request" renders as YOUR OWN orange chat bubble. Needs a `Message.kind` (user | event) so
    both sides render it as a system chip.
  - **Round 2:** messages arrive without a refresh (polling endpoint first, SSE later), optimistic
    send, typing indicator. Natural point to wire the standard **new-message email** (respecting
    notification prefs) from the transactional email suite.
  - **Round 3:** multiple photos/videos per message (reuse `MediaUpload`), PDF/document
    attachments (LinkedIn parity), emoji reactions on a message, reply-quoting. Schema:
    `Message.attachments`, `Message.replyToId`, `Message.kind`, and a `MessageReaction` model.
  - **NOT queued (deferred by decision):** inbox power features - pin/archive/mute/mark-unread and
    the LinkedIn-style right info panel with "Media & files", profile card, and report/block.
  - **ROUND 2 BUILT (commit 4cb1cf1), awaiting your test.** Messages arrive without a
    refresh: the conversation polls `/api/messages/<id>/updates` every 4s while the tab
    is visible (immediately on refocus), carrying new messages, the other side's read
    cursor, and their typing state. The cursor is the SERVER's clock from the previous
    response, so client clock skew can't skip a message; rows merge by id, so a message
    delivered by both the poll and the send response appears once. Sending is optimistic
    (your bubble appears at once, then swaps for the saved row, or turns red with "Not
    sent"). Typing lives on `Thread.aTypingAt/bTypingAt`, pinged at most every 3s and
    expiring after 6s, so there's no "stopped typing" call and a closed tab resolves
    itself.
    - The grouping model moved to `src/lib/chat.ts` (no `server-only`) so the client
      regroups polled messages exactly as the server rendered them.
    - BUGS FIXED along the way: (a) typing and mark-read now preserve `Thread.updatedAt`,
      which is `@updatedAt` - without that a keystroke, or merely OPENING a thread, would
      reorder the inbox, since it sorts by last activity; (b) SECURITY - the sender
      include is narrowed to id/name/avatarUrl (`chatMessageInclude`), because the old
      `include: { senderUser: true }` would have shipped the whole User row, password
      hash included, to the browser once the conversation became a client component.
    - STILL OUTSTANDING in Round 2: the **new-message email**. Blocked on the Resend API
      key (`.env` has none and `src/lib/services/email.ts` doesn't exist yet).
  - **ROUND 3 BUILT (commit pending), awaiting your test.** Several photos/videos AND
    documents per message, emoji reactions, and reply-quoting.
    - Schema: `Message.attachments` (JSON array of `{url, kind, name, size}`, with
      `imageUrl` kept as the cover mirror exactly as feed posts do), `Message.replyToId`
      (SetNull, so deleting a quoted message never deletes the reply), and a
      `MessageReaction` model with `@@unique([messageId, userId])`.
    - Reactions are ONE per identity per message, Messenger/LinkedIn style: the same
      emoji clears it, a different one replaces it. The emoji must come from the offered
      shortlist server-side, since it is stored and rendered.
    - Documents: PDF, Word, Excel, CSV, and text via `saveAttachment` (25 MB cap), with
      extensions from a whitelist rather than the uploaded filename.
    - A reply may only quote a message from the SAME thread, checked in the service, or
      it would leak a snippet of a conversation the sender isn't part of.
    - The poll returns ALL of a thread's reactions rather than a delta, because a removed
      reaction leaves nothing to send; the client replaces its map outright.
    - The composer uses a new `AttachmentPicker`, NOT the listing/feed `MediaUpload`:
      that one is built around drag-to-reorder because order there picks the cover photo,
      which is meaningless in a conversation, and it can't take documents.
    - `sendMessageAction` was deleted: the live composer replaced it and it had no
      remaining callers.
  - **ROUNDS 2 + 3 TESTED by Dean 07/22/2026. NOT signed off** - source doc:
    `CX Updates Needed 07_22_2026.pdf`. Rounds 2 and 3 stay OPEN until this punch list is
    built, retested, and signed off. Work the items in the order below; each is built,
    tested, then committed.
    1. **[BLOCKER-ish, live badges] Top-bar Notifications + Messages icons do not
       auto-refresh.** Dean sent a message as Tyler to Dean; neither the notification bell
       nor the message icon updated until he manually refreshed the whole page. They must
       update on their own, WITHOUT a full page reload that interrupts what the user is
       doing. Round 2's polling only covers an OPEN conversation, so this needs its own
       lightweight badge poll in the top bar (shared by both icons, one request).
    2. **Clicking a notification must clear it.** Today clicking one navigates to the
       target but leaves it unread in the bell. Clicking should mark that single
       notification read (and drop the badge count) as part of the navigation.
    3. **[OVERLAP BUG] The emoji/react button covers the message timestamp** ("6:06 AM" is
       hidden behind it), and the **smiley + reply arrow cover timestamps** generally. The
       hover actions and the hover timestamp are fighting for the same space beside the
       bubble. Re-place them so neither ever covers the other.
    4. **Typing dots in the wrong place.** They currently sit inline in the thread where
       the next bubble goes; Dean wants them at the BOTTOM by the message area, the way
       Facebook Messenger and LinkedIn do it. Also asked whether 7s is the right idle
       timeout - answer: use Messenger's behavior (it clears a few seconds after the last
       keystroke; our current 6s TTL with a 3s ping is in that range, so keep it and just
       move the indicator).
    5. **[LAYOUT BUG] Attaching several files is messy and RESIZES the composer**, which
       makes it hard to type a message alongside the files. HARD REQUIREMENT: attaching
       files must NOT change the message area's size at all. Rebuild the attachment tray
       Facebook-style - a fixed-height strip of small thumbnails ABOVE the input that
       scrolls sideways if there are many, leaving the input untouched.
    6. **[BUG] Sending a VIDEO failed** ("Not sent. Check your connection and send it
       again." on a 0:22 clip). `bodySizeLimit` is already 96mb, so that is NOT the cause.
       Likely either the 64 MB `MAX_VIDEO_BYTES` cap in `src/lib/storage.ts` or a MIME type
       outside the mp4/webm/quicktime whitelist. TWO fixes needed: (a) make video sending
       actually work, and (b) STOP reporting every failure as a connection problem - the
       error must say WHY ("That video is over the 64 MB limit", "That file type isn't
       supported"), which means `sendChatMessageAction` returning a real reason and the
       bubble showing it.
    7. **[OVERLAP BUG] Reaction pills sit on top of the attachment/bubble corner** (see the
       last page of the PDF). Give them their own space under the bubble.
    8. **Bigger emojis once used.** Reactions render too small to read; increase the pill
       and emoji size.
  - **STANDING RULE, set by Dean 07/22/2026: EVERY function in the software needs a
    TOOLTIP** on hover, saying what it does. Applies to everything built from now on, and
    retro-fitted to what already exists. Treat a missing tooltip as a defect, not a polish
    item.
  - **[NEW TASK] Professional icon set across the ENTIRE software** *(Dean 07/22/2026;
    MOCKUP FIRST, he wants to approve the icons before they go in)* - replace the current
    emoji-as-icon buttons (📷 etc.) with a consistent, professional icon set for Attach
    Photo, Attach File, GIF, and Emoji, all with tooltips, modeled on the LinkedIn and
    Facebook composers he attached. Applies everywhere these actions appear, not just the
    messenger: the feed composer, comment composers, and listing forms. CX already depends
    on `lucide-react`, which is the natural source. NOTE: **GIF is a NEW capability** - we
    have no GIF support today, so it needs a decision (a Giphy/Tenor picker means an API
    key and an external dependency).
  - **[NEW TASK] Full emoji picker, LinkedIn-style, across the entire software** *(Dean
    07/22/2026)* - the current 6-emoji shortlist is not enough. Build a real picker with a
    SEARCH box, category tabs (people, nature, food, travel, objects, symbols), and a
    "Frequently used" row, matching LinkedIn's style and behavior. Replace the existing
    pickers everywhere applicable (messenger reactions, message composer, feed comment
    composer). Decide when we start: ship a curated emoji dataset locally (no external
    dependency, no API key) vs pull in an emoji-picker library.
  - **RESUME HERE (next working session).**
    1. Work the Rounds 2 + 3 punch list above, top to bottom.
    2. Then the two new tasks (icon set, emoji picker), MOCKUP FIRST for the icons.
    3. The order milestone timeline (commit b2bad64) is tested + signed off; sample
       orders for every timeline case come from `scripts/seed-timeline-samples.ts`.
    4. Known gap, not built: the `/messages` index with NO thread open doesn't poll, so a
       new conversation arriving while you sit on the empty inbox still needs a refresh.
       Item 1 above (top-bar badge polling) partly covers this.
    5. REMINDER: any schema change means Dean must RESTART his dev server, since the
       generated Prisma client is loaded at boot.

- [ ] **Competitive gap analysis vs LinkedIn + Materials Market** *(new - QUEUED, research
  task; do a bit later)* - map CX's current features against the two references and produce
  a prioritized "missing features/workflows" list.
  - **LinkedIn side (social/professional):** connections vs our follow-only model, articles
    /long-form, events, jobs board, groups, newsletters, polls, endorsements/skills,
    recommendations, company pages analytics, saved posts, reshare/repost, notifications
    depth, search (people/companies/content), messaging (attachments, read receipts).
    LinkedIn is auth-walled (can't crawl); compare against its known feature set.
  - **Materials Market side (marketplace):** already researched - smart ORDER-MATCHING
    (route an order to eligible suppliers by delivery radius + product range, best-performer
    priority, accept within ~30 min); "Beat My Quote" price-beat; TRADE CREDIT / trade
    accounts (pay end of following month, 30 days EOM); multiple payment methods (cards,
    Apple/Google Pay, PayPal, Klarna/Clearpay); DELIVERY options (standard ~2 days, express
    /next-day) with SMS+email order tracking + status page; RETURNS/refunds policy window;
    supplier network/branches. Compare each to CX's buy/bid/offer + Orders + net/margin model.
  - Deliverable: `docs/CX-competitive-gap-analysis.md` (their feature -> do we have it? ->
    gap -> priority), feeding new roadmap items. Sources gathered: materialsmarket.com
    /how-it-works, /trade-credit, /returns, /faqs.

- [ ] **Real authentication + account/credential management** *(new - QUEUED, DECISIONS
  LOCKED; big foundational build; do in phases)*
  - **FINDING:** CX has NO real auth today. `src/app/actions/auth.ts` is a passwordless
    DEV STUB (type an email -> find-or-create -> signed in). No password on `User`, no
    hashing, no email verification. Session is a stateless HMAC-signed cookie
    (`src/lib/session.ts`), no DB session table, no revocation. So "reset password" etc.
    require building the credential layer first.
  - **DECIDED sign-in methods (Dean, 07/19):** Email + Password **AND** Google sign-in
    **AND** Microsoft sign-in (all three). Plus a **real transactional email provider**
    (Dean chose "pick provider now"; recommend **Resend** - simple, Next-friendly, free
    tier). Provider also unblocks Admin notifications.
  - **Recommended approach:** KEEP the existing custom session + acting-as system (it
    works and integrates with resolveActor); do NOT rip in NextAuth (would ripple through
    identity). Add: password hashing via Node `crypto.scrypt` (no dep), and OAuth via
    `arctic` (small lib, Google + Microsoft/Entra providers, BYO session). Token tables
    for email-verify + password-reset (hashed, single-use, expiring).
  - **Schema:** `User.passwordHash String?`, `User.emailVerified DateTime?`; new models
    `VerificationToken`, `PasswordResetToken`; `OAuthAccount` (provider, providerUserId,
    userId) for Google/Microsoft links. Reseed dev users with a known password.
  - **Phases (each: build -> test -> commit):**
    1. Email+password: signup sets a password, signin verifies it (scrypt); update seed.
    2. Email verification at signup (needs Resend key), AND a **Welcome email** on
       account creation: greeting, a link to the site, and a verify/confirm button.
       SECURITY: do NOT email a raw password. For self-signup the user already set
       their own password, so the welcome email carries the site link + verify link,
       not credentials. For accounts an ADMIN creates for someone (Option B staff, or
       future bulk invites), send an INVITE / "set your password" link instead of a
       plaintext password. FUTURE: include the mobile app store links (Apple App Store
       + Google Play) in the welcome email once the Expo apps ship.
    3. Forgot/reset password (emailed single-use link) - add a "Forgot password?"
       link on the sign-in page -> enter email -> emailed reset link -> set new password.
       ALSO "forgot email" account recovery (ANALYZE): the login email IS the identifier,
       so recovery needs another signal - look up the account by a verified PHONE number
       (would need to start collecting phone), or a support-assisted lookup by name +
       business. Decide the approach before building; may depend on adding phone to signup.
    4. Signed-in: change password (needs current), change login email (re-verify new,
       notify old), keep email unique.
    5. Google OAuth sign-in (arctic).
    6. Microsoft OAuth sign-in (arctic).
    7. Later: sessions list / "sign out everywhere", login rate-limit/lockout, 2FA,
       self-service account deactivate/delete, Terms acceptance at signup.
  - **Dean's external setup (needed before phases 2-6):** create a Resend account -> API
    key; create a Google OAuth client (client id/secret + redirect URI); create a
    Microsoft Entra app registration (client id/secret + redirect URI). All go in `.env`
    (never committed). I'll give exact steps when we start.
  - **Architecture:** `src/lib/services/account.ts` + `src/lib/services/auth.ts` services
    (framework-agnostic) + thin action/route shims; never log or email raw passwords/tokens.
  - **Also surfaced as missing standard account features** (queue as we go): notification
    preferences (email/SMS opt-in), block/report another user, account deactivate/delete.

- [ ] **Transactional email suite (STANDARD - build alongside features)** *(new - QUEUED;
  needs the email provider)* - the standard emails a marketplace/social platform sends.
  All from one sender service (`src/lib/services/email.ts` wrapping Resend) with shared
  templates, an unsubscribe/preference honor where relevant, and NEVER raw passwords:
  - Auth: **Welcome** (site link + verify), email **verification**, **password reset**,
    password-changed + email-changed security alerts, admin **invite / set-password**.
  - Commerce: **order confirmation / receipt**, payment received, **bid won / outbid**,
    offer accepted/declined, shipping/delivery + tracking updates, refund issued.
  - Social/engagement (respect notification prefs): new follower, new message, mentions,
    review received, weekly digest.
  - FUTURE: add Apple App Store + Google Play links to Welcome/receipts once the apps ship.
  - Guidance standing note: as we build each feature, I proactively flag its companion
    standard emails + notifications here rather than waiting to be asked.

- [ ] **Payments module (buyer payment methods + Stripe processing)** *(new - QUEUED, not
  started; later)* - two connected pieces:
  - **Buyer payment sources (frontend):** let a user add and store payment methods
    (card / bank) on their account, and pick one at checkout when making a purchase.
    Store only Stripe tokens/references, never raw card numbers (PCI: use Stripe
    Elements / SetupIntents; card data never touches our server or DB).
  - **Payment processing (backend):** integrate Stripe for customer payments - connect
    via the Stripe API (PaymentIntents for a set-price buy / won bid), webhooks for
    payment status, and refunds. Ties into the existing net/margin model (buyer pays
    the gross; CX keeps the margin) and the Orders flow. Likely Stripe Connect so seller
    payouts route correctly. Decide test-vs-live keys + who holds the Stripe account.
  - **High-value payments - ACH / bank + wire (ANALYZE FIRST):** big-ticket equipment
    (e.g. a $50k+ tractor/paver) usually will NOT go on a card (limits + ~3% fees). Add
    bank rails: Stripe **ACH debit** (via Financial Connections / bank account, lower fee,
    but slow + reversible) and a **wire / manual bank transfer** option (fast for large
    sums, non-reversible) for the biggest deals. Analysis needed before building: fee
    model + who absorbs it, escrow/hold until funds clear (ACH can take days and can
    bounce), verification/limits, and how bid wins settle. Likely a per-listing or
    per-price-threshold choice of allowed payment methods. Feeds the escrow/Orders design.
  - Architecture: a `src/lib/services/payments.ts` service (framework-agnostic) with the
    Stripe SDK; thin action/route shims; secrets in env, never committed.

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
  - Part 2 **(BUILT + tested + signed off)** — shared header: banner + overlapping photo (circle users / rounded-square companies),
    identity block, verified badge, follower counts, action buttons wired in, owner sees "Edit
    profile"; horizontal tab bar: Home · About · Posts · Photos · Listings · Reviews.
  - Part 3 *(BUILT + tested: Photos tab = card grid + lightbox + portfolio uploader; Posts tab =
    author's posts reusing feed PostCard + reactions/comments, on both /u and /company)* — the six tabs (Home overview, About, Posts feed by author, Photos = work/job portfolio
    gallery w/ lightbox, Listings storefront showing buyer_price only, Reviews avg+count with clean
    empty state). Listings tab must never expose sellerNet/margin.
  - Part 4 — ownership/editing: owner (or member with `canActAsCompany`) edits inline; everyone
    else read-only; gate edits server-side; respect acting-as context. Update seed so tabs render
    with real content plus one fresh empty-state profile. Commit/push per part.
    - Workspace parity **(BUILT + tested + signed off, commit 5781405)**: (a) **"View public"** button in
      the company workspace mirroring `/me`; (b) **Photos** management tab added to BOTH workspaces,
      before Listings/Storefront, owner can add/delete portfolio photos.
    - View-public review round **(BUILT + tested + signed off, commit 5781405)**: switching into a
      company always lands on its workspace; fresh sign-in lands on Marketplace acting as self
      (acting-as reset on sign-in/out); company view-public keeps `?view=public` across all tabs;
      personal view-public shows the "Previewing your public profile" banner; public/preview Photos
      tabs are read-only on both modules (management stays in the workspace).
    - STILL OPEN in Part 4: server-side inline edit gating for the public tabs proper; the Posts tab
      (still a placeholder on both modules); seed update so tabs render with real content + one fresh
      empty-state profile.
  - Photos social features (Step 2, requested): likes + comments per photo, reusing the feed's
    reaction picker + threaded comments. Needs an engagement target for photos (extend Reaction/
    Comment to a photo, or dedicated PhotoReaction/PhotoComment) - decide when we build it.
  - Posts enhancements (requested 07/11/2026) **- ALL BUILT + tested + signed off**:
    - (a) **Posts** tab on BOTH workspaces (personal `/me` + company workspace): the owner sees +
      manages all their posts, with a "Write a post" button to the Feed composer. Now also renders
      the full engagement bar + comment threads, so the owner can moderate from the workspace
      (commit d61cb2c).
    - (b) Composing a post (as user OR company) **defaults the Region + Trade** to the author's
      profile selection. Still editable per post (commit 09d08d8).
    - (c) Post **Edit/Delete moved onto the post card** as an owner-only "..." menu, so a whole post
      can be edited/deleted from the **feed** and the **post detail page**, not just the workspace.
      UI gate mirrors the service rule (author, or a member who may act for the author company);
      the service re-checks every mutation (commit e4c8282).
    - (d) **Public profiles are read-only**: no post Edit/Delete menu, and the owner's comment
      MODERATION delete is hidden on the public Posts tab (it stays in the feed + workspace).
      Comment authors can still delete their own comment. Display gate only; `deleteComment`
      re-authorizes server-side (commit e918277).
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
- **Marketplace product + equipment categories** *(taxonomy signed off 07/16/2026; WRITE side built,
  BROWSE-page redesign in progress)* - construction-industry PRODUCT/MATERIAL and EQUIPMENT category
  taxonomies (distinct from the trade taxonomy), two independent 2-level trees, used when a
  user/company LISTS an item and when a buyer FILTERS the marketplace. A listing is Trade + EITHER one
  Product OR one Equipment category (mutually exclusive), each with an optional sub-category.
  - [x] Taxonomy source approved and captured as `docs/CX-taxonomy-products-equipment.md` (+ CSV/XLSX),
    auto-derived into the framework-agnostic `src/lib/taxonomy.ts` (stable slugs, CSI MasterFormat
    anchors on products).
  - [x] **Write side** - `ItemKind` enum + `itemKind`/`categorySlug`/`subcategorySlug` on `Listing`
    (nullable, indexed); persisted in `src/lib/services/listings.ts`; slugs validated against the
    taxonomy in the action shim; `ItemClassification` picker on the new + edit forms; classification
    badge on the listing detail page; demo listings tagged in the seed.
  - [x] **Browse side** - redesigned `src/app/listings/page.tsx` (per the approved mock): navy rail with
    Products/Materials + Equipment filter groups as expandable 2-level multi-select trees (`cat`/`sub`
    params), all facets now multi-select (type/trade/condition/manufacturer), instant-apply filters (no
    Apply button - `FilterForm` intercepts submit and does a scroll-preserving router.replace; native
    GET fallback with JS off), a reserved active-filter chips row, and a card "kind" tag. Location keeps
    the linked State+City picker PLUS the distance-radius (haversine) search. Card thumb uses the branded
    CX / "Image coming soon" placeholder; rail order matches the mock.
  - [x] **07/17 tweaks** - Trade filter is now an expandable category tree like the taxonomy groups (no
    inner scrollbar, uniform with the rest). Distance filter gained a **Nationwide (any distance)** option
    past 250 mi: it drops the radius ring but keeps the chosen city as the center for Nearest sort + "~N
    mi". *(Awaiting your test.)*
  - [ ] **Paginate the browse grid** *(TODO, noted 07/18/2026)* - `src/app/listings/page.tsx` currently
    hard-caps at `rows.slice(0, 60)` with NO page controls, so listings past 60 are silently invisible
    (Materials Market paginates ~24/page with numbered pages). Add a page size + pager (a `page` query
    param, prev/next + numbered pages) OR a "Load more" like the feed. Must play nice with the
    instant-apply filters (changing a filter resets to page 1) and the distance/Nearest sort. Decide page
    size (24-48) when we build it.
- [x] **Top-bar "New" button** *(requested 07/17/2026)* - the header `+ List` link became a general **New**
  dropdown (`src/components/NewMenu.tsx`): New Listing (`/listings/new`) + New Post (`/feed`), so future
  create flows slot in here instead of adding more header buttons.
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
- [ ] **FULL FRONT-END QA PASS - test every module individually** *(added 07/22/2026, Dean's
  request; do this ONCE all features and functions are in, near go-live)* - a structured
  sweep of the live site, module by module, rather than the per-feature testing we do as we
  build. Each module gets its own numbered walkthrough with expected results, tested as a
  real user in the browser, and anything broken becomes its own fix task.
  - **Modules to cover, one at a time:** Marketplace / browse + filters + pagination;
    Listing detail; Create + edit listing (all four types); Checkout + offers/negotiation;
    Orders (buying and selling, all timeline states); Messenger (inbox, conversation, live
    updates, attachments, reactions, replies); Feed (composer, media, reactions, comments);
    Profiles (user + company, all six tabs, public vs owner view); Company workspace;
    Network / follows; Saved; Notifications; Insights; Search; Auth (sign up, sign in,
    reset, verify); Account + credential management; Admin panel (every module, every role).
  - **Test each module across:** the three admin roles plus a plain customer; acting as
    yourself vs acting as a company; desktop AND phone widths; and the empty state (a brand
    new account with no data) as well as a populated one.
  - **Watch specifically for:** anything a buyer can see that exposes sellerNet or margin;
    server-side authorization on every mutation (not just a hidden button); broken or
    missing images; and any page that scrolls sideways on a phone.
  - Deliverable: a pass/fail list per module, with failures queued as fix tasks here.

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
