"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireCapability, logAdminAction } from "@/lib/admin";
import { createNotification } from "@/lib/notifications";
import type { Party } from "@/lib/messaging";

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

// --- Verification requests (approve / deny with a note) ----------------------

async function resolveRequest(
  formData: FormData,
  approve: boolean,
): Promise<void> {
  const admin = await requireCapability("verification");
  const id = String(formData.get("requestId") ?? "");
  const note = String(formData.get("adminNote") ?? "").trim() || null;
  const req = await prisma.verificationRequest.findUnique({
    where: { id },
    include: { company: { select: { slug: true } } },
  });
  if (!req || req.status !== "pending") {
    revalidatePath("/admin/verification");
    return;
  }

  if (approve) {
    if (req.companyId) {
      await prisma.company.update({ where: { id: req.companyId }, data: { verified: true } });
    } else if (req.userId) {
      await prisma.user.update({ where: { id: req.userId }, data: { verified: true } });
    }
  }
  await prisma.verificationRequest.update({
    where: { id },
    data: {
      status: approve ? "approved" : "denied",
      adminNote: note,
      reviewedById: admin.id,
      reviewedAt: new Date(),
    },
  });

  const subjectType = req.companyId ? "company" : "user";
  const subjectId = req.companyId ?? req.userId!;
  await logAdminAction(
    admin.id,
    approve ? "verification.approve" : "verification.deny",
    subjectType,
    subjectId,
    note,
  );

  const recipient: Party = { type: subjectType, id: subjectId };
  const href = req.companyId ? `/company/${req.company?.slug ?? ""}` : "/me";
  await createNotification({
    recipient,
    type: "verification_update",
    actorUserId: admin.id,
    title: approve ? "You're verified" : "Verification needs changes",
    body: note ?? (approve ? "Your verification was approved." : "Your request wasn't approved."),
    href,
  });

  revalidatePath("/admin/verification");
  revalidatePath("/admin/companies");
  revalidatePath("/admin/users");
}

export async function approveVerificationRequestAction(formData: FormData) {
  await resolveRequest(formData, true);
}

export async function denyVerificationRequestAction(formData: FormData) {
  await resolveRequest(formData, false);
}
