"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getActingContext, isCompanyOwner } from "@/lib/identity";
import { saveDocuments } from "@/lib/storage";
import {
  submitVerificationRequest,
  type VerificationSubject,
} from "@/lib/services/verification";

/**
 * Web transport shim over the verification SERVICE (src/lib/services/verification.ts).
 * Owns only web concerns: resolve the subject (acting-as + owner permission) and
 * the return path, persist uploaded documents to URLs, then call the service and
 * map its result. See docs/CX-build-checklist.md section E.
 */
export async function requestVerificationAction(formData: FormData) {
  const user = await requireUser("/me");
  const ctx = await getActingContext(user.id);

  // Subject: the company being acted for (owner only) or the user themselves.
  let subject: VerificationSubject;
  let back: string;
  if (ctx.type === "company") {
    if (!(await isCompanyOwner(user.id, ctx.company.id))) {
      redirect(`/company/${ctx.company.slug}`);
    }
    subject = { type: "company", id: ctx.company.id };
    back = `/company/${ctx.company.slug}`;
  } else {
    subject = { type: "user", id: user.id };
    back = "/me";
  }

  // Validate required fields before persisting any uploads (avoids orphan files).
  const legalName = String(formData.get("legalName") ?? "").trim();
  const licenseNumber = String(formData.get("licenseNumber") ?? "").trim();
  const licenseState = String(formData.get("licenseState") ?? "").trim();
  const businessAddress = String(formData.get("businessAddress") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim() || null;
  if (!legalName || !licenseNumber || !licenseState || !businessAddress) {
    redirect(`${back}?verify=missing`);
  }

  const files = formData
    .getAll("documents")
    .filter((f): f is File => f instanceof File && f.size > 0);
  const newDocs = await saveDocuments(files);
  const keep = formData.getAll("keepDocuments").map(String);

  const result = await submitVerificationRequest(
    subject,
    { legalName, licenseNumber, licenseState, businessAddress, note },
    newDocs,
    keep,
  );
  if (result.status === "error") redirect(`${back}?verify=missing`);

  revalidatePath(back);
  revalidatePath("/admin/verification");
  redirect(`${back}?verify=submitted`);
}
