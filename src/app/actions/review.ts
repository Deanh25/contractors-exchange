"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";
import { controlsParty, type Party } from "@/lib/messaging";
import { getActingCompanies } from "@/lib/identity";
import { txParties } from "@/lib/orders";

function safeBack(value: FormDataEntryValue | null, fallback: string): string {
  const v = typeof value === "string" ? value : "";
  return v.startsWith("/") && !v.startsWith("//") ? v : fallback;
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

  const tx = await prisma.transaction.findUnique({ where: { id: txId } });
  if (!tx) redirect("/orders");
  if (tx.status !== "completed") redirect(back);
  if (!(stars >= 1 && stars <= 5)) redirect(back);

  // Reviewer = the side the user controls; ratee = the other side.
  const { buyer, seller } = txParties(tx);
  const acting = new Set((await getActingCompanies(user.id)).map((c) => c.id));
  const isBuyer = controlsParty(buyer, user.id, acting);
  const controlsSeller = controlsParty(seller, user.id, acting);

  let raterParty: Party;
  let rateeParty: Party;
  if (isBuyer) {
    raterParty = buyer;
    rateeParty = seller;
  } else if (controlsSeller) {
    raterParty = seller;
    rateeParty = buyer;
  } else {
    redirect("/orders");
  }

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

    await createNotification({
      recipient: rateeParty,
      type: "review_new",
      actorUserId: user.id,
      actorCompanyId: raterParty.type === "company" ? raterParty.id : null,
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
