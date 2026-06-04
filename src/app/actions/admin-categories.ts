"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireCapability, logAdminAction } from "@/lib/admin";
import { slugify } from "@/lib/slug";

/**
 * Category tree management (PRD §7C, superadmin). Create/rename/move/reorder/
 * archive/delete categories at any depth. Renaming keeps the slug stable so
 * existing listings keep resolving. Delete is blocked when listings reference the
 * category (archive instead). Every change is audit-logged.
 */

async function uniqueSlug(base: string): Promise<string> {
  const root = slugify(base) || "category";
  let slug = root;
  let n = 2;
  // Append -2, -3, ... until free.
  while (await prisma.category.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${root}-${n++}`;
  }
  return slug;
}

export async function createCategoryAction(formData: FormData) {
  const admin = await requireCapability("categories");
  const name = String(formData.get("name") ?? "").trim();
  const parentId = String(formData.get("parentId") ?? "").trim() || null;
  if (!name) redirect("/admin/categories?error=name");

  const siblings = await prisma.category.aggregate({
    where: { parentId },
    _max: { sortOrder: true },
  });
  const slug = await uniqueSlug(name);
  const created = await prisma.category.create({
    data: {
      name,
      slug,
      parentId,
      sortOrder: (siblings._max.sortOrder ?? -1) + 1,
    },
  });
  await logAdminAction(admin.id, "category.create", "margin", created.id, `${name} (${slug})`);
  revalidatePath("/admin/categories");
}

export async function renameCategoryAction(formData: FormData) {
  const admin = await requireCapability("categories");
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect("/admin/categories?error=name");
  // Slug stays stable so listings keep resolving; only the display name changes.
  await prisma.category.update({ where: { id }, data: { name } });
  await logAdminAction(admin.id, "category.rename", "margin", id, name);
  revalidatePath("/admin/categories");
}

export async function moveCategoryAction(formData: FormData) {
  const admin = await requireCapability("categories");
  const id = String(formData.get("id") ?? "");
  const parentId = String(formData.get("parentId") ?? "").trim() || null;
  if (parentId === id) redirect("/admin/categories?error=cycle");

  // Reject moving under one of its own descendants (would create a cycle).
  if (parentId) {
    const all = await prisma.category.findMany({ select: { id: true, parentId: true } });
    const childrenOf = new Map<string, string[]>();
    for (const c of all) {
      if (!c.parentId) continue;
      const arr = childrenOf.get(c.parentId) ?? [];
      arr.push(c.id);
      childrenOf.set(c.parentId, arr);
    }
    const descendants = new Set<string>();
    const stack = [id];
    while (stack.length) {
      const cur = stack.pop()!;
      for (const ch of childrenOf.get(cur) ?? []) {
        if (!descendants.has(ch)) {
          descendants.add(ch);
          stack.push(ch);
        }
      }
    }
    if (descendants.has(parentId)) redirect("/admin/categories?error=cycle");
  }

  const siblings = await prisma.category.aggregate({
    where: { parentId },
    _max: { sortOrder: true },
  });
  await prisma.category.update({
    where: { id },
    data: { parentId, sortOrder: (siblings._max.sortOrder ?? -1) + 1 },
  });
  await logAdminAction(admin.id, "category.move", "margin", id, null);
  revalidatePath("/admin/categories");
}

export async function reorderCategoryAction(formData: FormData) {
  const admin = await requireCapability("categories");
  const id = String(formData.get("id") ?? "");
  const dir = String(formData.get("dir") ?? "");
  const node = await prisma.category.findUnique({ where: { id } });
  if (!node) redirect("/admin/categories");

  const siblings = await prisma.category.findMany({
    where: { parentId: node.parentId },
    orderBy: { sortOrder: "asc" },
  });
  const i = siblings.findIndex((s) => s.id === id);
  const j = dir === "up" ? i - 1 : i + 1;
  if (i >= 0 && j >= 0 && j < siblings.length) {
    await prisma.$transaction([
      prisma.category.update({ where: { id: siblings[i].id }, data: { sortOrder: siblings[j].sortOrder } }),
      prisma.category.update({ where: { id: siblings[j].id }, data: { sortOrder: siblings[i].sortOrder } }),
    ]);
  }
  await logAdminAction(admin.id, "category.reorder", "margin", id, dir);
  revalidatePath("/admin/categories");
}

export async function archiveCategoryAction(formData: FormData) {
  const admin = await requireCapability("categories");
  const id = String(formData.get("id") ?? "");
  const value = formData.get("value") === "1";
  await prisma.category.update({ where: { id }, data: { archived: value } });
  await logAdminAction(admin.id, value ? "category.archive" : "category.unarchive", "margin", id, null);
  revalidatePath("/admin/categories");
}

export async function deleteCategoryAction(formData: FormData) {
  const admin = await requireCapability("categories");
  const id = String(formData.get("id") ?? "");
  const node = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { children: true } } },
  });
  if (!node) redirect("/admin/categories");
  // Block delete when it has children or any listing uses it - archive instead.
  if (node._count.children > 0) redirect("/admin/categories?error=haschildren");
  const used = await prisma.listing.count({ where: { tradeCategory: node.slug } });
  if (used > 0) redirect("/admin/categories?error=inuse");

  await logAdminAction(admin.id, "category.delete", "margin", id, node.name);
  await prisma.category.delete({ where: { id } }).catch(() => null);
  revalidatePath("/admin/categories");
}
