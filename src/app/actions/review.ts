"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";
import { listingOwnerParty, type Party } from "@/lib/messaging";
import { canActAs } from "@/lib/identity";

function safeBack(value: FormDataEntryValue | null, fallback: string): string {
  const v = typeof value === "string" ? value : "";
  return v.startsWith("/") && !v.startsWith("//") ? v : fallback;
}

/** Notify a ratee party of a new review (a user, or a company's team). */
async function notifyRatee(
  ratee: Party,
  n: { actorId: string; title: string; body: string | null; href: string; transactionId: string },
): Promise<void> {
  if (ratee.type === "user") {
    await createNotification({ userId: ratee.id, type: "review_new", ...n });
    return;
  }
  const members = await prisma.membership.findMany({
    where: { companyId: ratee.id, OR: [{ role: "owner" }, { canActAsCompany: true }] },
    select: { userId: true },
  });
  for (const m of members) {
    await createNotification({ userId: m.userId, type: "review_new", ...n });
  }
}

/**
 * Leave a review on a COMPLETED deal (PRD §7). Each side rates the other once.
 * Parties are derived from the deal: the seller party is the listing's owner
 * (a company or a user), the buyer party is the buyer. A company deal reviews
 * the company; a personal deal reviews the person.
 */
export async function createReviewAction(formData: FormData) {
  const user = await requireUser("/orders");
  const txId = String(formData.get("transactionId") ?? "");
  const stars = Math.round(Number(formData.get("stars")));
  const body = String(formData.get("body") ?? "").trim() || null;
  const back = safeBack(formData.get("back"), "/orders");

  const tx = await prisma.transaction.findUnique({
    where: { id: txId },
    include: { listing: true },
  });
  if (!tx) redirect("/orders");
  if (tx.status !== "completed") redirect(back);
  if (!(stars >= 1 && stars <= 5)) redirect(back);

  const sellerParty = listingOwnerParty(tx.listing);
  const buyerParty: Party = { type: "user", id: tx.buyerId };
  const isBuyer = tx.buyerId === user.id;
  const controlsSeller =
    !!sellerParty &&
    (sellerParty.type === "user"
      ? sellerParty.id === user.id
      : await canActAs(user.id, sellerParty.id));

  let raterParty: Party;
  let rateeParty: Party | null;
  if (isBuyer) {
    raterParty = buyerParty;
    rateeParty = sellerParty;
  } else if (controlsSeller && sellerParty) {
    raterParty = sellerParty;
    rateeParty = buyerParty;
  } else {
    redirect("/orders");
  }
  if (!rateeParty) redirect(back);

  // One review per person per deal.
  const existing = await prisma.review.findUnique({
    where: {
      transactionId_raterUserId: { transactionId: txId, raterUserId: user.id },
    },
  });
  if (!existing) {
    await prisma.review.create({
      data: {
        transactionId: txId,
        raterUserId: user.id,
        raterCompanyId: raterParty.type === "company" ? raterParty.id : null,
        rateeUserId: rateeParty.type === "user" ? rateeParty.id : null,
        rateeCompanyId: rateeParty.type === "company" ? rateeParty.id : null,
        stars,
        body,
      },
    });

    // Display name + profile href for the rating identity / ratee profile.
    let raterName = user.name;
    if (raterParty.type === "company") {
      const co = await prisma.company.findUnique({
        where: { id: raterParty.id },
        select: { name: true },
      });
      raterName = co?.name ?? user.name;
    }
    let href = `/u/${rateeParty.id}`;
    if (rateeParty.type === "company") {
      const co = await prisma.company.findUnique({
        where: { id: rateeParty.id },
        select: { slug: true },
      });
      href = co ? `/company/${co.slug}` : "/me";
    }

    await notifyRatee(rateeParty, {
      actorId: user.id,
      title: `${raterName} left you a ${stars}-star review`,
      body,
      href,
      transactionId: txId,
    });
    revalidatePath(href);
  }

  revalidatePath(back);
  redirect(back);
}
