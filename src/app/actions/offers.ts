"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getActingContext, getActingCompanies } from "@/lib/identity";
import type { Party } from "@/lib/messaging";
import {
  makeOffer,
  respondToOffer,
  type Actor,
} from "@/lib/services/offers";

/**
 * Web transport shim over the offers SERVICE (src/lib/services/offers.ts). This
 * file owns only web concerns: resolve the acting identity from cookies, read the
 * FormData, then map the service's typed result to a redirect/revalidate. All
 * negotiation logic lives in the service so a mobile API endpoint can reuse it.
 * See docs/CX-build-checklist.md section E.
 */

/** Build the service Actor from the cookie-based session + acting-as context. */
async function resolveActor(returnTo: string): Promise<Actor> {
  const user = await requireUser(returnTo);
  const ctx = await getActingContext(user.id);
  const party: Party =
    ctx.type === "company"
      ? { type: "company", id: ctx.company.id }
      : { type: "user", id: user.id };
  const actingCompanyIds = new Set(
    (await getActingCompanies(user.id)).map((c) => c.id),
  );
  return { userId: user.id, userName: user.name, party, actingCompanyIds };
}

// --- Buyer: make an offer ----------------------------------------------------

export async function makeOfferAction(formData: FormData) {
  const actor = await resolveActor("/listings");
  const listingId = String(formData.get("listingId") ?? "");

  const result = await makeOffer(actor, {
    listingId,
    buyerPrice: String(formData.get("buyerPrice") ?? ""),
    message: String(formData.get("message") ?? ""),
  });

  // redirect() throws, so each branch terminates the action.
  if (result.status === "created") {
    revalidatePath(`/messages/${result.threadId}`);
    redirect(`/messages/${result.threadId}`);
  }
  if (result.status === "existing") {
    redirect(`/messages/${result.threadId}`);
  }
  if (result.code === "no_listing") redirect("/listings");
  if (result.code === "bad_price") redirect(`/listings/${listingId}?error=offer`);
  redirect(`/listings/${listingId}`);
}

// --- Either side: respond (accept / decline / counter) -----------------------

export async function respondOfferAction(formData: FormData) {
  const actor = await resolveActor("/messages");
  const op = String(formData.get("op") ?? "");

  const result = await respondToOffer(actor, {
    offerId: String(formData.get("offerId") ?? ""),
    op: op as "accept" | "decline" | "counter",
    counterPrice: String(formData.get("buyerPrice") ?? ""),
  });

  // redirect() throws, so each branch terminates the action.
  if (result.status === "accepted") {
    revalidatePath(`/messages/${result.threadId}`);
    revalidatePath("/orders");
    redirect(`/orders/${result.transactionId}`);
  }
  if (result.status === "error") {
    redirect("/messages");
  }
  // declined | countered | noop all return to the negotiation thread.
  redirect(`/messages/${result.threadId}`);
}
