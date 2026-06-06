"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { resolveActor } from "@/lib/identity";
import { createDeal, updateDeal } from "@/lib/services/transactions";

/**
 * Web transport shim over the deal/order SERVICE (src/lib/services/transactions.ts).
 * Owns only web concerns: resolve the acting identity from cookies, read FormData,
 * compute the safe return path, then map the service's typed result to redirect/
 * revalidate. All deal logic lives in the service so a mobile endpoint can reuse it.
 * See docs/CX-build-checklist.md section E.
 */

/** Safe same-origin return path. */
function safeBack(value: FormDataEntryValue | null, fallback: string): string {
  const v = typeof value === "string" ? value : "";
  return v.startsWith("/") && !v.startsWith("//") ? v : fallback;
}

/**
 * Confirm a deal from the checkout step. Lands on the order page (checkout feel).
 */
export async function createTransactionAction(formData: FormData) {
  const actor = await resolveActor("/listings");
  const listingId = String(formData.get("listingId") ?? "");

  const result = await createDeal(actor, {
    listingId,
    qty: formData.get("qty") as string | null,
    bidAmount: String(formData.get("amount") ?? ""),
    message: String(formData.get("message") ?? ""),
  });

  // redirect() throws, so each branch terminates the action.
  if (result.status === "ok") {
    revalidatePath("/orders");
    redirect(`/orders/${result.transactionId}`);
  }
  if (result.code === "no_listing") redirect("/listings");
  if (result.code === "bad_bid") redirect(`/checkout/${listingId}?error=bid`);
  redirect(`/listings/${listingId}`); // forbidden
}

/** Advance a deal: accept / decline (seller), complete (either), cancel (buyer). */
export async function updateTransactionAction(formData: FormData) {
  const actor = await resolveActor("/orders");
  const back = safeBack(formData.get("back"), "/orders");

  const result = await updateDeal(actor, {
    transactionId: String(formData.get("transactionId") ?? ""),
    op: String(formData.get("op") ?? "") as
      | "accept"
      | "decline"
      | "complete"
      | "cancel",
  });

  if (result.status === "error") redirect("/orders");
  if (result.status === "noop") redirect(back); // invalid transition

  revalidatePath(`/messages/${result.threadId}`);
  revalidatePath("/orders");
  if (result.stockChanged) {
    revalidatePath(`/listings/${result.listingId}`);
    revalidatePath("/listings");
  }
  redirect(back);
}
