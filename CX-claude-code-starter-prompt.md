# Claude Code — Starter Prompt for Contractors Exchange (CX)

> **How to use:**
> 1. Create a new empty folder on your machine (e.g. `contractors-exchange`).
> 2. Open it in **VS Code**.
> 3. Put `CX-PRD.md` into the folder.
> 4. Open Claude Code in that folder and paste the prompt below.
>
> **GitHub note:** This project will be version-controlled in a NEW GitHub repository under your
> account. Two ways to set up the remote — the prompt handles both:
> - **Easiest:** before starting, create an empty repo on GitHub.com named `contractors-exchange`
>   (no README/gitignore — keep it empty), copy its URL, and paste it to Claude Code when asked.
> - **Automatic:** if you have the GitHub CLI (`gh`) installed and logged in (`gh auth login`),
>   Claude Code can create the repo for you — just tell it your GitHub username.

---

## Paste this into Claude Code:

```
Create a NEW project in this folder for "Contractors Exchange (CX)". The complete spec is in
CX-PRD.md in this directory — read it first and follow it.

IMPORTANT SETUP CONTEXT:
- I will host and run this entirely LOCALLY on my own machine (my computer acts as the server).
  I have done this before for an e-commerce project, so the needed runtimes (Node.js, etc.) are
  already installed. Target local-first development — no required external/cloud SaaS for v1.
- Scaffold everything from scratch in this folder as a new project.
- I want to reach a clickable, running visual quickly so I can then iterate module by module.

VERSION CONTROL (GitHub):
- This project must be tracked in a NEW GitHub repository under my account, named
  "contractors-exchange".
- As your very first steps: run `git init`, create a proper `.gitignore` for a Next.js project
  (node_modules, .env, .next, local DB files, /public/uploads, etc.), and make an initial commit.
- For the remote: first check whether the GitHub CLI is available (`gh --version`). If `gh` is
  installed and authenticated, offer to create the repo for me with `gh repo create` (ask for my
  GitHub username first). If `gh` is NOT available, pause and ask me to create an empty repo named
  "contractors-exchange" on GitHub.com and paste you the URL, then wire it up as the `origin`
  remote and push.
- IMPORTANT: make sure `.env` and any secrets/local DB files are gitignored BEFORE the first push.
- After EACH numbered build step below, make a clear, well-described git commit (and push to
  origin) so the repo builds up incrementally and I have a clean history to roll back to.

WHAT CX IS:
A community marketplace for the construction industry — "LinkedIn meets a B2B marketplace" for
contractors across all trades. Users (individuals AND companies) can sell, auction (bid), or
trade/exchange goods and services, organized by trade and location, inside a unified feed that
mixes marketplace listings with industry discussion posts. Simple 1:1 messaging connects users.
The platform is designed to earn commission on on-platform transactions (payments are STUBBED in
v1 — see PRD §7).

STACK (local-first):
- Next.js (App Router) + TypeScript
- Tailwind CSS
- Prisma ORM with LOCAL PostgreSQL preferred; if Postgres is a setup blocker, use SQLite for
  zero-config local dev and keep the data layer swappable to Postgres later.
- Local-friendly auth that works fully offline (e.g. NextAuth email magic-link in dev, or a
  simple dev credential flow). No dependency on a third-party auth SaaS for v1.
- Image uploads to the local filesystem in dev; abstract storage so cloud can swap in later.
- Must run with `npm run dev` at localhost:3000.

BUILD IN THIS ORDER (full detail in PRD §11):
1. Scaffold Next.js + TS + Tailwind + Prisma; pick local DB (Postgres, SQLite fallback); confirm
   localhost:3000 runs with a placeholder home page.
2. Identity & accounts — User, Company, Membership models; sign-in; create individual profile +
   company page. (This dual-identity model is the spine — see PRD §2 — get it right first.)
3. Listings — create-listing form supporting all FOUR types (set price / open for bid /
   trade-exchange goods or services), each listing tagged with trade category + location;
   listing detail page; structured browse/search/filter by trade + location.
4. Unified feed — one feed mixing listings + discussion posts, filtered by the trades/locations
   the user follows; onboarding captures trade(s) + location so the feed is relevant immediately.
   Simple reverse-chronological + filters, NOT an algorithmic feed.
5. Messaging — simple 1:1 threads, leakage-aware: surface the on-platform Buy/Bid/Complete action
   inside the thread; entry points from listings and profiles.
6. Transactions (STUBBED) — purchase/bid/trade-request create a record and notify the seller;
   represent escrow/buyer-protection in the UI but DO NOT move money in v1.
7. Trust — verification badges (manual flag for now), ratings/reviews from completed transactions.
8. Seed data + polish — seed several trades, a few companies + individuals across 2-3 metro areas,
   ~10-15 listings across all four types, and a few discussion posts so it's demoable. Responsive
   pass (phone + desktop). Confirm the full core loop works end to end locally.

DATA MODEL: use the Prisma schema in PRD §10 (User, Company, Membership, Listing, Post, Follow,
Transaction, Message, Review). Enforce listing-type field exclusivity at the schema/validation
layer.

UX: dead-simple and "Facebook-Marketplace-easy," list in under 2 minutes, truly responsive,
passwordless/simple sign-in, auto/quick location, camera or upload photos, everyone is both buyer
and seller (no role switch), guest browsing allowed (account required only to list/message/transact).

DO NOT BUILD in v1 (PRD §9): live payments/real escrow (stub it), algorithmic feed, group chat /
real-time messaging infra, groups/events/endorsements, freight calculation, government sealed-bid
features, native mobile apps.

START NOW by:
1. Telling me exactly what you're about to scaffold and which local DB you recommend (Postgres vs
   SQLite) given local-first dev, and why.
2. Setting up version control: `git init`, a proper Next.js `.gitignore` (ensure `.env`, local DB
   files, and uploads are ignored), and the GitHub remote per the VERSION CONTROL section above
   (check for `gh`; otherwise ask me to create the empty "contractors-exchange" repo and share the
   URL). Make the initial commit and push.
3. Scaffolding the project and getting a running localhost:3000 with a placeholder page; commit.
4. Then proceeding through the build order above, pausing after each numbered step so I can see
   the visual and give feedback before you continue — and making a clear commit + push after each.

As you go: set up any needed config/.env with clear placeholders, tell me exactly what (if
anything) I need to do on my machine at each step (DB init, migrations, env values), and note any
assumptions you make where the PRD is silent.
```

---

## What to expect / have ready

- **Node.js** installed (you have it). Claude Code will tell you if it needs anything else.
- **Local database:** if you already have PostgreSQL running locally from the prior project, mention that to Claude Code and it'll use it. If not, let it use SQLite to start — zero setup, swappable later.
- **Pacing:** the prompt tells Claude Code to **pause after each build step** so you get a visual and can steer — exactly the module-by-module workflow you described.

## Good follow-up prompts (module-by-module iteration)

- "Show me how to run it and open it in my browser."
- "Commit and push what we have, then walk me through the GitHub repo."
- "The identity/accounts module is done — let's refine the company page before moving on."
- "Now build the listings module per PRD step 3, then pause."
- "Switch the local DB from SQLite to my local PostgreSQL."
- "When we're ready, scope out Phase 2: real payments + escrow + commission."

## Note on scope

This builds **CX (Contractors Exchange)** — the broad, all-trades platform with dual identity,
unified feed, and messaging, per our planning. The earlier strategy/exploration work (the
eight-section analysis, leakage/trust reasoning, go-to-market) still applies and is worth keeping
alongside this as your strategy reference and investor narrative.
