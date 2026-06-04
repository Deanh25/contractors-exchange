"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireCapability, logAdminAction } from "@/lib/admin";

/**
 * Verification (PRD §7C, Module 3). Grant or revoke the verified badge on users
 * and companies (moderator+). The badge renders across the public app, so this
 * is a trust action; every change is audit-logged. Shared with the user/company
 * management module.
 */

function safeBack(value: FormDataEntryValue | null, fallback: string): string {
  const v = typeof value === "string" ? value : "";
  return v.startsWith("/admin") ? v : fallback;
}

export async function setUserVerifiedAction(formData: FormData) {
  const admin = await requireCapability("verification");
  const userId = String(formData.get("userId") ?? "");
  const value = formData.get("value") === "1";
  const back = safeBack(formData.get("back"), "/admin/verification");
  await prisma.user.update({ where: { id: userId }, data: { verified: value } });
  await logAdminAction(
    admin.id,
    value ? "user.verify" : "user.unverify",
    "user",
    userId,
    null,
  );
  revalidatePath("/admin/verification");
  revalidatePath("/admin/users");
  redirect(back);
}

export async function setCompanyVerifiedAction(formData: FormData) {
  const admin = await requireCapability("verification");
  const companyId = String(formData.get("companyId") ?? "");
  const value = formData.get("value") === "1";
  const back = safeBack(formData.get("back"), "/admin/verification");
  await prisma.company.update({
    where: { id: companyId },
    data: { verified: value },
  });
  await logAdminAction(
    admin.id,
    value ? "company.verify" : "company.unverify",
    "company",
    companyId,
    null,
  );
  revalidatePath("/admin/verification");
  revalidatePath("/admin/companies");
  redirect(back);
}
