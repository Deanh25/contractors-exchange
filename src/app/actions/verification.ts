"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { getActingContext, isCompanyOwner } from "@/lib/identity";
import { saveDocuments } from "@/lib/storage";
import { Prisma } from "@/generated/prisma/client";

/**
 * Submit (or update) a verification request (PRD §7C). The account provides its
 * legal business name, contractor license + state, business address, and uploads
 * supporting documents. It lands in the admin verification queue as "pending".
 * Companies submit as an OWNER; individuals submit for themselves.
 */

function docsFromJson(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

export async function requestVerificationAction(formData: FormData) {
  const user = await requireUser("/me");
  const ctx = await getActingContext(user.id);

  // Subject: the company being acted for (owner only) or the user themselves.
  let subject: { type: "user" | "company"; id: string };
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

  const subjectWhere =
    subject.type === "company"
      ? { companyId: subject.id }
      : { userId: subject.id };
  const existing = await prisma.verificationRequest.findFirst({
    where: { ...subjectWhere, status: "pending" },
  });

  const docs = existing
    ? [...docsFromJson(existing.documents), ...newDocs]
    : newDocs;
  const data = {
    legalName,
    licenseNumber,
    licenseState,
    businessAddress,
    note,
    documents: docs.length > 0 ? docs : Prisma.JsonNull,
  };

  if (existing) {
    await prisma.verificationRequest.update({ where: { id: existing.id }, data });
  } else {
    await prisma.verificationRequest.create({
      data: { ...subjectWhere, ...data },
    });
  }

  revalidatePath(back);
  revalidatePath("/admin/verification");
  redirect(`${back}?verify=submitted`);
}
