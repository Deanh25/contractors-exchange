"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { saveImage } from "@/lib/storage";
import { TRADES } from "@/lib/trades";
import type { Prisma } from "@/generated/prisma/client";

const TRADE_SLUGS = new Set(TRADES.map((t) => t.slug));

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
    image instanceof File && image.size > 0 ? await saveImage(image) : null;

  const data: Prisma.PostCreateInput = {
    body,
    tradeTag,
    regionTag,
    imageUrl,
    ...(authorCompanyId
      ? { authorCompany: { connect: { id: authorCompanyId } } }
      : { authorUser: { connect: { id: authorUserId! } } }),
  };

  await prisma.post.create({ data });

  revalidatePath("/feed");
  redirect("/feed");
}
