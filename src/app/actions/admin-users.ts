"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireCapability, logAdminAction } from "@/lib/admin";
import {
  createUserWithRole,
  setUserRole,
  ADMIN_ROLES,
} from "@/lib/services/admin-users";
import type { AdminRole } from "@/generated/prisma/client";

/**
 * User & company management (PRD §7C, Module 4). Soft-suspend (reversible,
 * admin+) and hard-delete (superadmin only, typed confirm + reason). Verification
 * lives in admin-trust.ts and is reused here. Everything is audit-logged.
 *
 * Creating a teammate and granting admin roles (superadmin only) delegate to the
 * framework-agnostic service in src/lib/services/admin-users.ts; these actions
 * stay thin shims: authorize, parse FormData, call the service, then map the
 * typed result to an audit log + revalidate + redirect.
 */

function safeBack(value: FormDataEntryValue | null, fallback: string): string {
  const v = typeof value === "string" ? value : "";
  return v.startsWith("/admin") ? v : fallback;
}

function parseRole(value: FormDataEntryValue | null): AdminRole {
  const v = typeof value === "string" ? value : "";
  return (ADMIN_ROLES as string[]).includes(v) ? (v as AdminRole) : "none";
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

/**
 * Create a new account (superadmin only), optionally with an admin role. The
 * person signs in later via the passwordless email flow.
 */
export async function createUserAction(formData: FormData) {
  const admin = await requireCapability("manageAdmins");
  const name = String(formData.get("name") ?? "");
  const email = String(formData.get("email") ?? "");
  const adminRole = parseRole(formData.get("adminRole"));

  const result = await createUserWithRole({ name, email, adminRole });
  if (!result.ok) redirect(`/admin/users?error=create_${result.error}`);

  await logAdminAction(
    admin.id,
    "user.create",
    "user",
    result.user.id,
    result.assignedRole !== "none" ? `role=${result.assignedRole}` : null,
  );
  revalidatePath("/admin/users");
  redirect("/admin/users?ok=created");
}

/** Grant/change a user's admin role (superadmin only; lockout-guarded). */
export async function setUserRoleAction(formData: FormData) {
  const admin = await requireCapability("manageAdmins");
  const userId = String(formData.get("userId") ?? "");
  const adminRole = parseRole(formData.get("adminRole"));

  const result = await setUserRole({ userId, adminRole }, admin.id);
  if (!result.ok) {
    // A no-op selection is not an error; just return to the list.
    if (result.error === "nochange") redirect("/admin/users");
    redirect(`/admin/users?error=role_${result.error}`);
  }

  await logAdminAction(
    admin.id,
    "user.role",
    "user",
    userId,
    `${result.previousRole} -> ${result.user.adminRole}`,
  );
  revalidatePath("/admin/users");
  redirect("/admin/users?ok=role");
}
