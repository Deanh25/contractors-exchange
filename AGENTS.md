<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Architecture: thin actions over a service layer (REQUIRED)

CX is getting a mobile app (Expo / React Native) later. To keep that cheap, business
logic must NOT live in Server Actions or UI. It lives in a framework-agnostic service
layer that a future mobile API can call.

**Rule for every new or changed feature:**
- Put domain logic in `src/lib/services/<domain>.ts`. A service takes a resolved
  `Actor` (or plain ids) plus typed input and returns a typed result. It must NOT use
  `FormData`, `redirect`, `revalidatePath`, `cookies()`, or `next/*`.
- Keep the Server Action a thin shim: resolve identity with `resolveActor()` from
  `src/lib/identity.ts`, parse FormData, save any uploaded media to a URL, call the
  service, then map the typed result to `redirect`/`revalidatePath`.
- Authorization and media-file saving may stay in the shim (transport concerns).

Every existing mutation module already follows this (offers, transactions, messages,
listings, posts, engagement, follows, saved, profile, notifications, reviews,
verification). Copy one of those as the template. Shared pieces: the `Actor` type
(`src/lib/services/actor.ts`) and `resolveActor()` (`src/lib/identity.ts`). Background
and rationale: `docs/CX-build-checklist.md` section E.

Style: do not use em or en dash characters anywhere; use a comma or a plain hyphen.
