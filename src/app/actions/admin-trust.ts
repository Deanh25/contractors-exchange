"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireCapability, logAdminAction } from "@/lib/admin";

/**
 * Verification (PRD §7C, Module 3). Grant OR revoke the verified badge on users
 * and companies (moderator+). The badge renders across the public app, so this
 * is a trust action; every change is audit-logged. Shared with the user/company
 * management module. Revalidates in place (no redirect) so the verification
 * manager keeps its search/filter state.
 */

export async function setUserVerifiedAction(formData: FormData) {
  const admin = await requireCapability("verification");
  const userId = String(formData.get("userId") ?? "");
  const value = formData.get("value") === "1";
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
}

export async function setCompanyVerifiedAction(formData: FormData) {
  const admin = await requireCapability("verification");
  const companyId = String(formData.get("companyId") ?? "");
  const value = formData.get("value") === "1";
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
}
