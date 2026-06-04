import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";

/**
 * Catalog taxonomy (PRD §7C). The admin-managed category tree (DB) is the source
 * of truth for the marketplace catalog. Listings attach to LEAF categories (no
 * children). Reads are cached per request via React cache(). Seeded from the
 * original trade slugs so existing records keep resolving.
 */

export type CategoryNode = {
  id: string;
  slug: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
  archived: boolean;
  depth: number;
  children: CategoryNode[];
};

export const getAllCategories = cache(async () =>
  prisma.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
);

/** The full tree: top-level nodes with nested, sorted children + depth. */
export const getCategoryTree = cache(async (): Promise<CategoryNode[]> => {
  const rows = await getAllCategories();
  const byId = new Map<string, CategoryNode>();
  for (const r of rows) {
    byId.set(r.id, {
      id: r.id,
      slug: r.slug,
      name: r.name,
      parentId: r.parentId,
      sortOrder: r.sortOrder,
      archived: r.archived,
      depth: 0,
      children: [],
    });
  }
  const roots: CategoryNode[] = [];
  for (const r of rows) {
    const node = byId.get(r.id)!;
    const parent = r.parentId ? byId.get(r.parentId) : null;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  const sortRec = (nodes: CategoryNode[], depth: number) => {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder);
    for (const n of nodes) {
      n.depth = depth;
      sortRec(n.children, depth + 1);
    }
  };
  sortRec(roots, 0);
  return roots;
});

/** Flatten the tree into a depth-ordered list (for an indented admin view). */
export async function getCategoryList(): Promise<CategoryNode[]> {
  const tree = await getCategoryTree();
  const out: CategoryNode[] = [];
  const walk = (nodes: CategoryNode[]) => {
    for (const n of nodes) {
      out.push(n);
      walk(n.children);
    }
  };
  walk(tree);
  return out;
}

/** slug -> name, for label lookups. */
export const getCategoryLabelMap = cache(async (): Promise<Record<string, string>> => {
  const rows = await getAllCategories();
  const m: Record<string, string> = {};
  for (const r of rows) m[r.slug] = r.name;
  return m;
});

export type LeafOption = { value: string; label: string; group: string };

/** Non-archived LEAF categories as picker options, grouped by their top ancestor. */
export const getLeafOptions = cache(async (): Promise<LeafOption[]> => {
  const tree = await getCategoryTree();
  const out: LeafOption[] = [];
  const walk = (nodes: CategoryNode[], topName: string | null) => {
    for (const n of nodes) {
      if (n.archived) continue;
      const top = topName ?? n.name;
      if (n.children.length === 0) out.push({ value: n.slug, label: n.name, group: top });
      else walk(n.children, top);
    }
  };
  walk(tree, null);
  return out;
});

/** Valid leaf slugs (for server-side validation). */
export const getLeafSlugSet = cache(async (): Promise<Set<string>> => {
  const opts = await getLeafOptions();
  return new Set(opts.map((o) => o.value));
});
