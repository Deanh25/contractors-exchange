"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireCapability, logAdminAction } from "@/lib/admin";
import { TRADES } from "@/lib/trades";

/**
 * Category margin config (PRD §7C, Module 6). Superadmin-only CRUD over the flat
 * per-category margin table. Editing a margin affects FUTURE listings only;
 * existing listings keep their stored marginPct. Every change is audit-logged.
 */

const TRADE_SLUGS = new Set(TRADES.map((t) => t.slug));

export async function setCategoryMarginAction(formData: FormData) {
  const admin = await requireCapability("margins");
  const category = String(formData.get("category") ?? "").trim();
  const pct = Number(String(formData.get("marginPct") ?? "").replace(/[^0-9.]/g, ""));
  if (!TRADE_SLUGS.has(category) || !Number.isFinite(pct) || pct < 0) {
    redirect("/admin/margins?error=input");
  }
  const marginPct = Math.round(pct * 100) / 100;

  await prisma.categoryMargin.upsert({
    where: { category },
    create: { category, marginPct },
    update: { marginPct },
  });
  await logAdminAction(
    admin.id,
    "margin.update",
    "margin",
    category,
    `${category} = ${marginPct}%`,
  );
  revalidatePath("/admin/margins");
  redirect("/admin/margins");
}

export async function removeCategoryMarginAction(formData: FormData) {
  const admin = await requireCapability("margins");
  const category = String(formData.get("category") ?? "").trim();
  await prisma.categoryMargin
    .delete({ where: { category } })
    .catch(() => null); // already gone is fine
  await logAdminAction(
    admin.id,
    "margin.remove",
    "margin",
    category,
    `${category} reverted to the code default`,
  );
  revalidatePath("/admin/margins");
  redirect("/admin/margins");
}
