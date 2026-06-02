"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { isCompanyOwner } from "@/lib/identity";

/** Resolve the company by id and the path back to its page. Owner-gated. */
async function requireOwner(companyId: string, userId: string) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true, slug: true },
  });
  if (!company) redirect("/me");
  if (!(await isCompanyOwner(userId, company.id))) {
    redirect(`/company/${company.slug}`);
  }
  return company;
}

/** Invite an existing CX user (by email) onto the team as a member. */
export async function inviteMemberAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const companyId = String(formData.get("companyId") ?? "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const company = await requireOwner(companyId, user.id);
  const back = `/company/${company.slug}?tab=team`;

  if (!email) redirect(`${back}&error=email`);
  const invitee = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  // v1: you can only add people who already have a CX account.
  if (!invitee) redirect(`${back}&error=nouser`);

  const existing = await prisma.membership.findUnique({
    where: { userId_companyId: { userId: invitee.id, companyId } },
    select: { id: true },
  });
  if (!existing) {
    await prisma.membership.create({
      data: { userId: invitee.id, companyId, role: "member" },
    });
  }
  revalidatePath(`/company/${company.slug}`);
  redirect(back);
}

/** Promote / demote a member (owner <-> member). Keeps at least one owner. */
export async function setMemberRoleAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const companyId = String(formData.get("companyId") ?? "");
  const membershipId = String(formData.get("membershipId") ?? "");
  const role = String(formData.get("role") ?? "");
  const company = await requireOwner(companyId, user.id);
  const back = `/company/${company.slug}?tab=team`;
  if (role !== "owner" && role !== "member") redirect(back);

  const target = await prisma.membership.findFirst({
    where: { id: membershipId, companyId },
  });
  if (!target) redirect(back);

  // Don't allow demoting the last owner.
  if (target.role === "owner" && role === "member") {
    const owners = await prisma.membership.count({
      where: { companyId, role: "owner" },
    });
    if (owners <= 1) redirect(`${back}&error=lastowner`);
  }

  await prisma.membership.update({
    where: { id: target.id },
    data: { role },
  });
  revalidatePath(`/company/${company.slug}`);
  redirect(back);
}

/** Grant / revoke a member's permission to act as the company. */
export async function setMemberCanActAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const companyId = String(formData.get("companyId") ?? "");
  const membershipId = String(formData.get("membershipId") ?? "");
  const value = String(formData.get("value") ?? "") === "1";
  const company = await requireOwner(companyId, user.id);
  const back = `/company/${company.slug}?tab=team`;

  await prisma.membership.updateMany({
    where: { id: membershipId, companyId },
    data: { canActAsCompany: value },
  });
  revalidatePath(`/company/${company.slug}`);
  redirect(back);
}

/** Remove a member from the team. Keeps at least one owner. */
export async function removeMemberAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const companyId = String(formData.get("companyId") ?? "");
  const membershipId = String(formData.get("membershipId") ?? "");
  const company = await requireOwner(companyId, user.id);
  const back = `/company/${company.slug}?tab=team`;

  const target = await prisma.membership.findFirst({
    where: { id: membershipId, companyId },
  });
  if (!target) redirect(back);

  if (target.role === "owner") {
    const owners = await prisma.membership.count({
      where: { companyId, role: "owner" },
    });
    if (owners <= 1) redirect(`${back}&error=lastowner`);
  }

  await prisma.membership.delete({ where: { id: target.id } });
  revalidatePath(`/company/${company.slug}`);
  redirect(back);
}
