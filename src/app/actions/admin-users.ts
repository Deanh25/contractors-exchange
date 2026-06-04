"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireCapability, logAdminAction } from "@/lib/admin";

/**
 * User & company management (PRD §7C, Module 4). Soft-suspend (reversible,
 * admin+) and hard-delete (superadmin only, typed confirm + reason). Verification
 * lives in admin-trust.ts and is reused here. Everything is audit-logged.
 */

function safeBack(value: FormDataEntryValue | null, fallback: string): string {
  const v = typeof value === "string" ? value : "";
  return v.startsWith("/admin") ? v : fallback;
}

export async function setUserSuspendedAction(formData: FormData) {
  const admin = await requireCapability("users");
  const userId = String(formData.get("userId") ?? "");
  const value = formData.get("value") === "1";
  const back = safeBack(formData.get("back"), "/admin/users");
  await prisma.user.update({ where: { id: userId }, data: { suspended: value } });
  await logAdminAction(
    admin.id,
    value ? "user.suspend" : "user.unsuspend",
    "user",
    userId,
    null,
  );
  revalidatePath("/admin/users");
  redirect(back);
}

export async function setCompanySuspendedAction(formData: FormData) {
  const admin = await requireCapability("users");
  const companyId = String(formData.get("companyId") ?? "");
  const value = formData.get("value") === "1";
  const back = safeBack(formData.get("back"), "/admin/companies");
  await prisma.company.update({
    where: { id: companyId },
    data: { suspended: value },
  });
  await logAdminAction(
    admin.id,
    value ? "company.suspend" : "company.unsuspend",
    "company",
    companyId,
    null,
  );
  revalidatePath("/admin/companies");
  redirect(back);
}

export async function deleteUserAction(formData: FormData) {
  const admin = await requireCapability("hardDelete");
  const userId = String(formData.get("userId") ?? "");
  const confirm = String(formData.get("confirm") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim() || null;
  // Guard: typed confirmation, and never delete your own account.
  if (confirm !== "DELETE" || userId === admin.id) {
    redirect("/admin/users?error=confirm");
  }
  await logAdminAction(admin.id, "user.delete", "user", userId, reason);
  await prisma.user.delete({ where: { id: userId } }).catch(() => null);
  revalidatePath("/admin/users");
  redirect("/admin/users");
}

export async function deleteCompanyAction(formData: FormData) {
  const admin = await requireCapability("hardDelete");
  const companyId = String(formData.get("companyId") ?? "");
  const confirm = String(formData.get("confirm") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim() || null;
  if (confirm !== "DELETE") redirect("/admin/companies?error=confirm");
  await logAdminAction(admin.id, "company.delete", "company", companyId, reason);
  await prisma.company.delete({ where: { id: companyId } }).catch(() => null);
  revalidatePath("/admin/companies");
  redirect("/admin/companies");
}
