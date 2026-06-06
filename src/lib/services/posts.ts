import "server-only";
import { prisma } from "@/lib/prisma";
import { getLeafSlugSet } from "@/lib/categories";
import { createNotification } from "@/lib/notifications";
import type { Party } from "@/lib/messaging";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Feed post SERVICE (PRD §4). Framework-agnostic: no FormData/redirect/revalidate/
 * cookies. Media saving + author authorization (which company the user may post as)
 * stay in the caller; this owns tag-token parsing, validation, persistence, and
 * mention notifications. See docs/CX-build-checklist.md section E.
 */

/** Parse the composer's "tagIds" field ("user:ID,company:ID,...") into parties. */
function parseTagParties(raw: string): Party[] {
  const out: Party[] = [];
  const seen = new Set<string>();
  for (const tok of raw.split(",")) {
    const [type, id] = tok.split(":");
    if ((type !== "user" && type !== "company") || !id) continue;
    const key = `${type}:${id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ type, id });
  }
  return out.slice(0, 10);
}

export type CreatePostParams = {
  /** The acting human (for notification actor + author-name fallback). */
  actorUserId: string;
  actorUserName: string;
  /** The resolved + authorized author party (self or a permitted company). */
  author: { type: "user" | "company"; id: string };
  body: string;
  tradeRaw: string;
  regionRaw: string;
  /** Already-saved media URL, if any (the caller handles upload). */
  imageUrl: string | null;
  /** Raw "tagIds" composer field. */
  tagIdsRaw: string;
};

/** Publish a discussion post: validate trade/region tags, persist, tag + notify. */
export async function createPost(
  params: CreatePostParams,
): Promise<{ postId: string }> {
  const authorCompanyId = params.author.type === "company" ? params.author.id : null;
  const authorUserId = params.author.type === "user" ? params.author.id : null;

  const tradeTag =
    params.tradeRaw && (await getLeafSlugSet()).has(params.tradeRaw)
      ? params.tradeRaw
      : null;
  const regionTag = params.regionRaw
    ? params.regionRaw.toUpperCase().slice(0, 2)
    : null;

  const data: Prisma.PostCreateInput = {
    body: params.body,
    tradeTag,
    regionTag,
    imageUrl: params.imageUrl,
    ...(authorCompanyId
      ? { authorCompany: { connect: { id: authorCompanyId } } }
      : { authorUser: { connect: { id: authorUserId! } } }),
  };

  const post = await prisma.post.create({ data });

  // Tags: mention users / companies. Validate they exist, persist, and notify.
  const tags = parseTagParties(params.tagIdsRaw);
  if (tags.length > 0) {
    const userIds = tags.filter((t) => t.type === "user").map((t) => t.id);
    const companyIds = tags.filter((t) => t.type === "company").map((t) => t.id);
    const [validUsers, validCompanies] = await Promise.all([
      userIds.length
        ? prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true } })
        : Promise.resolve([]),
      companyIds.length
        ? prisma.company.findMany({ where: { id: { in: companyIds } }, select: { id: true } })
        : Promise.resolve([]),
    ]);
    const validUserIds = new Set(validUsers.map((u) => u.id));
    const validCompanyIds = new Set(validCompanies.map((c) => c.id));
    const valid = tags.filter((t) =>
      t.type === "user" ? validUserIds.has(t.id) : validCompanyIds.has(t.id),
    );

    if (valid.length > 0) {
      await prisma.postTag.createMany({
        data: valid.map((t) => ({
          postId: post.id,
          taggedUserId: t.type === "user" ? t.id : null,
          taggedCompanyId: t.type === "company" ? t.id : null,
        })),
      });

      // Author display for the notification.
      let authorName = params.actorUserName;
      if (authorCompanyId) {
        const co = await prisma.company.findUnique({
          where: { id: authorCompanyId },
          select: { name: true },
        });
        authorName = co?.name ?? params.actorUserName;
      }
      // Don't notify the author tagging themselves / their own company.
      for (const t of valid) {
        if (t.type === "company" && t.id === authorCompanyId) continue;
        await createNotification({
          recipient: t,
          type: "post_mention",
          actorUserId: params.actorUserId,
          actorCompanyId: authorCompanyId,
          title: `${authorName} mentioned you in a post`,
          body: params.body.slice(0, 140),
          href: "/feed",
        });
      }
    }
  }

  return { postId: post.id };
}
