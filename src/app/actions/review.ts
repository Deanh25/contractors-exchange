"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { resolveActor } from "@/lib/identity";
import { createReview } from "@/lib/services/reviews";

/**
 * Web transport shim over the review SERVICE (src/lib/services/reviews.ts).
 * Owns only web concerns: resolve the acting identity, parse FormData, compute the
 * safe return path, and map the typed result to redirect/revalidate. See
 * docs/CX-build-checklist.md section E.
 */

function safeBack(value: FormDataEntryValue | null, fallback: string): string {
  const v = typeof value === "string" ? value : "";
  return v.startsWith("/") && !v.startsWith("//") ? v : fallback;
}

/** Leave a review on a COMPLETED deal. Each side rates the other once. */
export async function createReviewAction(formData: FormData) {
  const actor = await resolveActor("/orders");
  const back = safeBack(formData.get("back"), "/orders");

  const result = await createReview(actor, {
    transactionId: String(formData.get("transactionId") ?? ""),
    stars: Math.round(Number(formData.get("stars"))),
    body: String(formData.get("body") ?? "").trim() || null,
  });

  if (result.status === "error") redirect("/orders");
  if (result.status === "invalid") redirect(back);
  if (result.status === "created") revalidatePath(result.href);

  revalidatePath(back);
  redirect(back);
}
