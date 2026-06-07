/*
 * ADDITIVE sample data for the engagement + network modules. Unlike seed.ts this
 * does NOT wipe anything: it layers sample follows (people + companies, incl.
 * company-as-follower), post reactions, and a nested comment thread onto whatever
 * users/companies/posts already exist. Guarded, so it is safe to re-run.
 *
 * Run:  npx tsx prisma/seed-samples.ts
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

function buildAdapter() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set (see .env.example).");
  const u = new URL(url);
  return new PrismaMariaDb({
    host: u.hostname,
    port: u.port ? Number(u.port) : 3306,
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, ""),
    insertIdAsNumber: true,
    decimalAsNumber: true,
  });
}

const prisma = new PrismaClient({ adapter: buildAdapter() });

const RTYPES = ["like", "insightful", "respect", "helpful"] as const;
type TargetType = "user" | "company";

async function ensureFollow(
  followerUserId: string,
  followerCompanyId: string | null,
  targetType: TargetType,
  targetValue: string,
): Promise<boolean> {
  // Don't follow your own identity.
  if (followerCompanyId && followerCompanyId === targetValue) return false;
  if (!followerCompanyId && targetType === "user" && followerUserId === targetValue)
    return false;
  const existing = await prisma.follow.findFirst({
    where: { followerUserId, followerCompanyId, targetType, targetValue },
  });
  if (existing) return false;
  await prisma.follow.create({
    data: { followerUserId, followerCompanyId, targetType, targetValue },
  });
  return true;
}

async function ensureReaction(
  postId: string,
  userId: string,
  companyId: string | null,
  type: (typeof RTYPES)[number],
): Promise<boolean> {
  const where = companyId
    ? { postId, companyId }
    : { postId, userId, companyId: null };
  const existing = await prisma.reaction.findFirst({ where });
  if (existing) return false;
  await prisma.reaction.create({ data: { postId, userId, companyId, type } });
  return true;
}

async function main() {
  const [users, companies, posts] = await Promise.all([
    prisma.user.findMany({
      select: { id: true, name: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.company.findMany({
      select: {
        id: true,
        name: true,
        memberships: {
          select: { userId: true },
          orderBy: { createdAt: "asc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.post.findMany({
      select: { id: true },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ]);

  console.log(
    `Current: ${users.length} users, ${companies.length} companies, ${posts.length} recent posts.`,
  );
  if (users.length < 2 || posts.length === 0) {
    console.log(
      "Not enough existing data to layer samples onto. Run a full reseed first (npx tsx prisma/seed.ts).",
    );
    return;
  }

  const U = users.slice(0, Math.min(8, users.length));
  const C = companies.slice(0, Math.min(6, companies.length));

  // ---- Follows: a dense web of people + companies -------------------------
  let followsAdded = 0;
  for (let i = 0; i < U.length; i++) {
    const f = U[i];
    for (const j of [1, 2]) {
      const t = U[(i + j) % U.length];
      if (t && (await ensureFollow(f.id, null, "user", t.id))) followsAdded++;
    }
    if (C.length) {
      const co = C[i % C.length];
      if (await ensureFollow(f.id, null, "company", co.id)) followsAdded++;
    }
  }
  // Company-as-follower: the first 1-2 companies follow some people + a company.
  for (let i = 0; i < Math.min(2, C.length); i++) {
    const co = C[i];
    const member = co.memberships[0]?.userId;
    if (!member) continue;
    for (const t of U.slice(0, 3)) {
      if (await ensureFollow(member, co.id, "user", t.id)) followsAdded++;
    }
    const otherCo = C[(i + 1) % C.length];
    if (otherCo && (await ensureFollow(member, co.id, "company", otherCo.id)))
      followsAdded++;
  }

  // ---- Reactions on recent posts (varied types + one company reaction) ----
  let reactionsAdded = 0;
  const reactors = U;
  for (let i = 0; i < posts.length; i++) {
    const p = posts[i];
    const n = Math.min(2 + i, reactors.length);
    for (let k = 0; k < n; k++) {
      const r = reactors[k];
      if (await ensureReaction(p.id, r.id, null, RTYPES[(i + k) % RTYPES.length]))
        reactionsAdded++;
    }
    // A company reaction (company-as-actor) on the newest post.
    const member = C[0]?.memberships[0]?.userId;
    if (i === 0 && member && C[0]) {
      if (await ensureReaction(p.id, member, C[0].id, "respect")) reactionsAdded++;
    }
  }

  // ---- A nested comment thread with auto-tag mentions ---------------------
  let commentsAdded = 0;
  const marker = "[sample]";
  const target = posts[0];
  const a = U[0];
  const b = U[1];
  const d = U[2] ?? U[0];
  const already = await prisma.comment.findFirst({
    where: { postId: target.id, body: { contains: marker } },
  });
  if (!already) {
    const c1 = await prisma.comment.create({
      data: { postId: target.id, userId: a.id, body: `Solid write-up, appreciate you sharing this. ${marker}` },
    });
    const c2 = await prisma.comment.create({
      data: { postId: target.id, userId: b.id, body: `We hit the exact same issue on a job last month. ${marker}` },
    });
    // Reply that auto-tags b (mention), nested under c2.
    const c3 = await prisma.comment.create({
      data: {
        postId: target.id,
        userId: d.id,
        parentId: c2.id,
        mentionedUserId: b.id,
        body: `How did you end up handling it? ${marker}`,
      },
    });
    // Deeper reply that auto-tags d, nested under c3.
    await prisma.comment.create({
      data: {
        postId: target.id,
        userId: a.id,
        parentId: c3.id,
        mentionedUserId: d.id,
        body: `Curious about the fix here too. ${marker}`,
      },
    });
    // A couple of comment reactions.
    await prisma.commentReaction.create({
      data: { commentId: c2.id, userId: a.id, type: "like" },
    });
    await prisma.commentReaction.create({
      data: { commentId: c1.id, userId: b.id, type: "respect" },
    });
    commentsAdded += 4;
  }

  console.log(
    `Added: ${followsAdded} follows, ${reactionsAdded} post reactions, ${commentsAdded} comments.`,
  );
  const [f, rx, cm, cr] = await Promise.all([
    prisma.follow.count(),
    prisma.reaction.count(),
    prisma.comment.count(),
    prisma.commentReaction.count(),
  ]);
  console.log(
    `Totals now: ${f} follows, ${rx} post reactions, ${cm} comments, ${cr} comment reactions.`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
