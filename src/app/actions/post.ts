"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { saveMedia } from "@/lib/storage";
import { TRADES } from "@/lib/trades";
import { createNotification } from "@/lib/notifications";
import type { Party } from "@/lib/messaging";
import type { Prisma } from "@/generated/prisma/client";

const TRADE_SLUGS = new Set(TRADES.map((t) => t.slug));

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

/**
 * Publish a discussion post (PRD §4): text + optional image, optionally tagged
 * by trade and region (state). Authored as the user or a company they own.
 */
export async function createPostAction(formData: FormData) {
  const user = await requireUser("/feed");

  const body = String(formData.get("body") ?? "").trim();
  const owner = String(formData.get("owner") ?? "self");
  const tradeRaw = String(formData.get("tradeTag") ?? "").trim();
  const regionRaw = String(formData.get("regionTag") ?? "").trim();

  if (!body) redirect("/feed?error=empty");

  // Resolve author: self, or a company the user owns (PRD §2 permissions).
  let authorUserId: string | null = null;
  let authorCompanyId: string | null = null;
  if (owner === "self") {
    authorUserId = user.id;
  } else {
    const m = await prisma.membership.findUnique({
      where: { userId_companyId: { userId: user.id, companyId: owner } },
    });
    // Owners and members granted canActAsCompany may post as the company.
    if (!m || (m.role !== "owner" && !m.canActAsCompany)) {
      redirect("/feed?error=owner");
    }
    authorCompanyId = owner;
  }

  const tradeTag = TRADE_SLUGS.has(tradeRaw) ? tradeRaw : null;
  const regionTag = regionRaw ? regionRaw.toUpperCase().slice(0, 2) : null;

  const image = formData.get("image");
  const imageUrl =
    image instanceof File && image.size > 0 ? await saveMedia(image) : null;

  const data: Prisma.PostCreateInput = {
    body,
    tradeTag,
    regionTag,
    imageUrl,
    ...(authorCompanyId
      ? { authorCompany: { connect: { id: authorCompanyId } } }
      : { authorUser: { connect: { id: authorUserId! } } }),
  };

  const post = await prisma.post.create({ data });

  // Tags: mention users / companies. Validate they exist, persist, and notify.
  const tags = parseTagParties(String(formData.get("tagIds") ?? ""));
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
      let authorName = user.name;
      if (authorCompanyId) {
        const co = await prisma.company.findUnique({
          where: { id: authorCompanyId },
          select: { name: true },
        });
        authorName = co?.name ?? user.name;
      }
      // Don't notify the author tagging themselves / their own company.
      for (const t of valid) {
        if (t.type === "company" && t.id === authorCompanyId) continue;
        await createNotification({
          recipient: t,
          type: "post_mention",
          actorUserId: user.id,
          actorCompanyId: authorCompanyId,
          title: `${authorName} mentioned you in a post`,
          body: body.slice(0, 140),
          href: "/feed",
        });
      }
    }
  }

  revalidatePath("/feed");
  redirect("/feed");
}
